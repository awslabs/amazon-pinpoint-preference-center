/**
 * @module preferenceCenterHandler
 * @author davelem
 * @version 1.0.0
 */
const METADATA_TABLE = process.env.METADATA_TABLE;
const CORS_DOMAIN = process.env.CORS_DOMAIN;
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const pinpoint = new AWS.Pinpoint({region: process.env.REGION});
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const xss = require("xss");
const xssOptions = {'stripIgnoreTag':true,'stripIgnoreTagBody':true}; // Specifiy Custom XSS Options here
const sanitizer = new xss.FilterXSS(xssOptions);
const crypto = require('crypto');
const { Validator } = require('node-input-validator');
const axios = require('axios');
var log = require('loglevel');

/*****************
 * Helper Functions
 *****************/

 /**
 * Formats a custom Pinpoint event
 * @param  {String} preferenceCenterID The preference center id
 * @param  {String} eventType A pinpoint event type
 * @param  {Object} endpoint The pinpoint project or application id
 * @param  {Object} attributes Custom attributes to add to pinpoint event
 * @return {Object} Returns a pinpoint custom event object
 */
function createPinpointEvent (preferenceCenterID, eventType, endpoint, attributes) {
  if(!endpoint) endpoint = {};
  if(!attributes) attributes = {};

  var customEvent = {
    Endpoint: endpoint,
    Events: {}
  };
  
  log.debug(JSON.stringify(customEvent,null,2));

  customEvent.Events[`preferenceCenter_${preferenceCenterID}`] = {
    EventType: eventType,
    Timestamp: moment().toISOString(),
    Attributes: attributes
  };
  return customEvent;
}

 /**
 * Writes a batch of custom pinpoint events
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {Array} events Collection of custom events to add
 * @return {Promise} 
 */
function processEvents (projectId, events) {
  return new Promise((resolve) => {
    var params = {
      ApplicationId: projectId,
      EventsRequest: {
        BatchItem: events
      }
    };
    
    log.debug(JSON.stringify(params,null,2));

    pinpoint.putEvents(params, function (err) {
      if (err) {
        log.error(err, err.stack);
        resolve(); // Just going to log and return
      } else {
        resolve();
      }
    });
  });
}

 /**
 * Writes a batch of custom pinpoint events
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {String} preferenceCenterID The preference center id
 * @return {Promise} A Promise object that contatins the metadata retrieved from DynamoDB
 */
function getMetadata(projectID, preferenceCenterID) {
  log.trace("getMetadata...");
    return new Promise((resolve, reject) => {        
        var params = {
            TableName: METADATA_TABLE,
            Key: {
                projectID : projectID,
                preferenceCenterID : preferenceCenterID
            }
        };
        
        log.trace(params);

        dynamo.get(params, function(err, metadata) {
            if (err) {
                log.error(err);
                reject(err);
            }
            else {
                log.debug(metadata.Item);
                resolve(metadata.Item);
            }
        });
    });
}

 /**
 * Writes a batch of custom pinpoint events
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {String} userID The User.UserID to retrieve
 * @return {Promise} A Promise object that contatins a collection of user endpoints
 */
function getUserEndpoints(projectID, userID) {
    log.trace("getUserEndpoints...");
    return new Promise((resolve, reject) => {

        var params = {
            ApplicationId: projectID,
            UserId: userID
        };

        log.trace(params);
        pinpoint.getUserEndpoints(params, function(err, data) {
            if (err) {
                log.error(err, err.stack); 
                reject(err);
            } else {
                log.debug(data.EndpointsResponse.Item);

                //Strip off INACTIVE
                var filteredEndpoints = data.EndpointsResponse.Item.filter(endpoint => endpoint.EndpointStatus !== 'INACTIVE');
                log.debug(filteredEndpoints);

                resolve(filteredEndpoints);
            }
        });
    });
}

 /**
 * Validates the provided hash to make sure it matches our hash key
 * @param  {String} userID The User.UserID hashed with the hash key
 * @param  {String} providedHash The provided hash
 * @param  {String} hashKey The Hash key for the given preference center
 * @return {boolean} A boolean indicating if the provided hash is valid
 */
function validateHash(userID, providedHash, hashKey) {
  log.trace("validateHash...");
  if (userID && providedHash && hashKey) {
    var hashValue = `${userID}+${hashKey}`;

    var hash = crypto.createHash('sha256')
    .update(hashValue)
    .digest('hex');

    if (providedHash == hash) {
      log.debug("Valid Hash!");
      return true;
    } else {
      log.warn("Invalid Hash!");
      return false;
    }

  } else {
    return false;
  }
}

 /**
 * Upserts a collection of endpoints synchronously to avoid hammering the API
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {Object[]} endpoints The endpoints to upsert
 * @param  {Object} metadata The metadata so we can do input validation
 * @return {Promise} A Promise object that returns the User.ID.  If it was a new user then this will contain the UUID that was generated
 */
function upsertEndpoints(projectID, endpoints, metadata) {
  log.trace("upsertEndpoints...");
  return new Promise((resolve, reject) => {

      var userID = '';
      endpoints.forEach(endpoint => {
        if(endpoint.User.UserId) userID = endpoint.User.UserId;
      });

      if(!userID) userID = uuidv4(); //New user so generate a UUID

      //Run these synchronously so we don't hammer the API  
      endpoints.reduce( (previousPromise, nextEndpoint) => {
        return previousPromise.then(() => {
          return upsertEndpoint(projectID, userID, nextEndpoint, metadata);
        });
      }, Promise.resolve())
      .then(()=>{
        log.debug(userID);
        resolve(userID);
      }).catch((err)=>{
        log.error(err);
        reject(err);
      });

  });
}

 /**
 * Writes a batch of custom pinpoint events
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {String} [userID=UUID] - userID The User.UserID to retrieve will default to new UUID if not specified
 * @param  {Object} endpoint The endpoint to upsert
 * @param  {Object} metadata The metadata so we can do input validation
 * @return {Promise} A Promise object that contatins a collection of user endpoints
 */
function upsertEndpoint(projectID, userID, endpoint, metadata) {
  log.trace("upsertEndpoint...");
  return new Promise((resolve, reject) => {

      var endpointID = endpoint.Id || uuidv4(); //New Endpoint, go generate a UUID

      endpoint.User.UserId = userID;

      //Remove following attributes...they were part of Get, but the Update doesn't like them
      delete endpoint.ApplicationId;
      delete endpoint.CohortId;
      delete endpoint.CreationDate;
      delete endpoint.Id; 

      //Sanitize all user specified values
      endpoint.Address = sanitizer.process(endpoint.Address);
      for (const property in endpoint.User.UserAttributes) {
        endpoint.User.UserAttributes[property].forEach(function(value,index) {
          endpoint.User.UserAttributes[property][index] = sanitizer.process(value);
        });
      }
      
      //Validate Inputs
      var dataToValidate = {};
      var validationRules = {};
      
        //available channels
        metadata.availableChannels.forEach(function(availableChannel) {
            if (availableChannel.id == endpoint.ChannelType) {
                dataToValidate[endpoint.ChannelType] = endpoint.Address;
                validationRules[endpoint.ChannelType] = availableChannel.serverMask || 'string'; //default to string validation
            }
        });
        
        //publications
        metadata.categories.forEach(function(category) {
            category.publications.forEach(function(publication) {
                validationRules[publication.id] = 'array';
                validationRules[`${publication.id}.*`] = 'alpha';
            });
        });
        
        //attributes
        metadata.attributes.forEach(function(attribute) {
            validationRules[attribute.id] = 'array';
            validationRules[`${attribute.id}.*`] = attribute.serverMask || 'string'; //default to string validation
            for (const property in endpoint.User.UserAttributes) {
                dataToValidate[property] = endpoint.User.UserAttributes[property];
            }
        });
      
      const v = new Validator(dataToValidate, validationRules);
     
      v.check().then(function (matched) {
        if (matched === true) {
            var params = {
                ApplicationId: projectID,
                EndpointId: endpointID,
                EndpointRequest: endpoint
              };

              log.trace(JSON.stringify(params,null,2));

              pinpoint.updateEndpoint(params, function(err, data) {
                  if (err) {
                      log.error(err, err.stack); 
                  } else {
                      log.debug(data);
                      resolve(data);
                  }
            });
        } else {
            //validation errors
            log.error("Input Validation Errors:", JSON.stringify(v.errors, null, 2));
            reject(new Error(`Input Validation Errors: ${JSON.stringify(v.errors, null, 2)}`));
        }
      });
  });
}

 /**
 * Writes a batch of custom pinpoint events
 * @param  {object} metric The AWS Solution Metric to write
 * @return {Promise} A Promise object that contatins a collection of user endpoints
 */
function sendAnonymousMetric(metric) {
  log.trace("sendAnonymousMetric...");
  return new Promise((resolve, reject) => {

    const options = {
      url: 'https://metrics.awssolutionsbuilder.com/generic',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: metric
    };

    log.trace(JSON.stringify(options,null,2));

    axios(options)
    .then(function (response) {
      log.debug(JSON.stringify(response.data, null, 2));
      resolve({});
    })
    .catch(function (error) {
      log.error(error);
      resolve(error); //Ignoring as I don't want metric failures to stop normal pricing
    });
  });
}

/*****************
 * Main Lambda Function
 *****************/

 /**
 * Main Lambda Handler...Start Here.
 * @param  {Object} event The Lambda event object
 * @param  {Object} context The Lambda Context Object
 * @param  {Object[]} callback The lambda callback method to execute when the function completes
 */
exports.handler =  (event, context, callback) => {
    log.setLevel(process.env.LOG_LEVEL || 'info');
    log.info('Received event:', JSON.stringify(event, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '500' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": CORS_DOMAIN, // Required for CORS support to work
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
        },
    });

    try {
        var preferenceCenterID = event.queryStringParameters && event.queryStringParameters.pcid ? event.queryStringParameters.pcid : 'default';
        var metadata = {};
        var pinpointEvents = {};
        var projectID = event.pathParameters.projectID;
        var endpoints = [];

        switch (event.resource) {
            case '/preferencecenter/{projectID}':
                if (event.pathParameters && projectID) {
                    log.debug("Requesting Metadata: ",projectID," ", preferenceCenterID);
                    getMetadata(projectID, preferenceCenterID)
                    .then(function(returnedMetadata) {
                        metadata = returnedMetadata;
                        pinpointEvents[projectID] = createPinpointEvent(preferenceCenterID, 'preferenceCenter_open');
                        return processEvents(projectID, pinpointEvents);
                    })
                    .then(function(){
                        if (process.env.SEND_ANONYMOUS_DATA === 'Yes') {
                            let metric = {
                                Solution: process.env.SOLUTION_ID,
                                UUID: process.env.SOLUTION_UUID,
                                TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                                preferenceCenter_opens: 1
                            };
                            return sendAnonymousMetric(metric);
                        }
                    })
                    .then(function(){
                      delete metadata.hashKey; //strip this off
                      log.debug("Finished Requesting Metadata:");
                      done(null, metadata);
                    }).catch(function(e) {
                        log.error(e);
                        done(e);
                    });
                } else {
                    done({ "status": "error", "message": "Missing Required Parameters." });
                }
                
                break;
                
            case '/preferencecenter/{projectID}/users':
            case '/preferencecenter/{projectID}/users/{userID}':
                switch (event.httpMethod) {
                    case 'GET':
                        if (event.pathParameters && projectID) {
                            if (!event.pathParameters.userID){
                                log.debug("No UserID passed, so must be Optin");
                                done(null, []);
                            } else {
                            
                                if(event.queryStringParameters && event.queryStringParameters.h && event.pathParameters.userID){
                                    //requesting an endpoint
                                    
                                    var userID = event.pathParameters.userID;
                                    var hash = event.queryStringParameters.h;
            
                                    log.debug("Requesting Endpoint: ",userID);
            
                                    getMetadata(projectID, preferenceCenterID)
                                    .then(function(returnedMetadata) {
                                        if (validateHash(userID, hash, returnedMetadata.hashKey)){
                                          return getUserEndpoints(projectID, userID);
                                        } else {
                                          console.error("Invalid Hash!");
                                          done(null, endpoints); //Just send back empty endpoints array
                                        }
                                    })
                                    .then(function(returnedEndpoints) {
                                        endpoints = returnedEndpoints;
                                        pinpointEvents[projectID] = createPinpointEvent(preferenceCenterID, 'preferenceCenter_getUser', {}, {'userID':userID});
                                        return processEvents(projectID, pinpointEvents);
                                    })
                                    .then(function (){
                                        log.debug("Finished Requesting Endpoint: ",userID);
                                        done(null, endpoints);
                                    }).catch(function(e) {
                                        log.error(e);
                                        done(e);
                                    });
                                } 
                            }
                        } else {
                            done({ "status": "error", "message": "Missing Required Parameters." });
                        }
                        
                        break;
                    case 'PUT':
                        if (event.pathParameters && projectID) {
                          endpoints = JSON.parse(event.body);
                          log.debug("Saving Endpoints:");
                          
                          getMetadata(projectID, preferenceCenterID)
                          .then(function(returnedMetadata) {
                              return upsertEndpoints(projectID, endpoints, returnedMetadata);
                          })
                          .then(function(userID) {
                              return getUserEndpoints(projectID, userID);
                          })
                          .then(function(returnedEndpoints) {
                              endpoints = returnedEndpoints;
                              endpoints.forEach(endpoint => {
                                  
                                let clonedEndpoint = { ... endpoint }; //Make a copy, so we don't mess up the original
                                //Remove following attributes...they were part of Get, but the Update doesn't like them
                                delete clonedEndpoint.ApplicationId;
                                delete clonedEndpoint.CohortId;
                                delete clonedEndpoint.CreationDate;
                                delete clonedEndpoint.Id; 
                                pinpointEvents[projectID] = createPinpointEvent(preferenceCenterID, 'preferenceCenter_updateEndpoint', clonedEndpoint, {});
                              });
                              return processEvents(projectID, pinpointEvents);
                          })
                          .then(function(){
                                if (process.env.SEND_ANONYMOUS_DATA === 'Yes') {
                                    let metric = {
                                        Solution: process.env.SOLUTION_ID,
                                        UUID: process.env.SOLUTION_UUID,
                                        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                                        preferenceCenter_updateEndpoint: 1
                                    };
                                    return sendAnonymousMetric(metric);
                                }
                          })
                          .then(function(){
                              log.debug("Finished Saving Endpoints:");
                              done(null, endpoints);
                          }).catch(function(e) {
                              console.error(e);
                              if (process.env.SEND_ANONYMOUS_DATA === 'Yes') {
                                    let metric = {
                                        Solution: process.env.SOLUTION_ID,
                                        UUID: process.env.SOLUTION_UUID,
                                        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                                        preferenceCenter_errors: 1
                                    };
                                    sendAnonymousMetric(metric)
                                    .then(function(){
                                        done(e);
                                    })
                                    .catch(function(e){
                                        done(e);
                                    });
                                }
                          });
                        } else {
                            done({ "status": "error", "message": "Missing Required Parameters." });
                        }
                    break;
                    
                default: 
                    done(new Error(`Unsupported method "${event.httpMethod}"`));
                    break;
                    
                }
        }
        
    } catch (err) {
        log.error(err);
        done({ "status": "error", "message": "Unhandled Error." });
    }
};
