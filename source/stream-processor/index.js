/**
 * @module preferenceCenterStreamProcessor
 * @author davelem
 * @version 1.0.0
 */
console.log('Loading function');
var AWS = require("aws-sdk");
const pinpoint = new AWS.Pinpoint({region: process.env.REGION});

//Pull in DocumentClient so we can translate DynamoDB format into easier things to parse
var docClient =  new AWS.DynamoDB.DocumentClient();
var dynamodbTranslator = docClient.getTranslator();
var ItemShape = docClient.service.api.operations.getItem.output.members.Item;

/*****************
 * Helper Functions
 *****************/

 /**
 * Gets all segments for a given project/application ID
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @return {Promise} A Promise object that contatins segments
 */
function getSegments(projectID) {
  return new Promise((resolve, reject) => {        
    var params = {
      ApplicationId: projectID
    };
    pinpoint.getSegments(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.SegmentsResponse.Item);
      }     
    });
  });
}

 /**
 * Creates a collection of segments synchronously to avoid hammering the API
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {String[]} segments The segments to create
 * @return {Promise} 
 */
function createSegments(projectID, preferenceCenterID, segments) {
  return new Promise((resolve, reject) => {

      if (segments.length <= 0) resolve(); //just return if we have nothing to process

      //Run these synchronously so we don't hammer the API  
      segments.reduce( (previousPromise, nextSegment) => {
        return previousPromise.then(() => {
          return createSegment(projectID, preferenceCenterID, nextSegment);
        });
      }, Promise.resolve())
      .then(()=>{
        resolve();
      }).catch((err)=>{
        reject(err);
      });

  });
}

 /**
 * Creates a pinpoint segment
 * @param  {String} projectId The pinpoint application/project id to associate the events with
 * @param  {String[]} segment The segment to create
 * @return {Promise} 
 */
function createSegment(projectID, preferenceCenterID, segment) {
  return new Promise((resolve, reject) => {  
    
    var templateSegment = {
      "Name": `PC_${preferenceCenterID}_${segment.publicationID}_${segment.channelID}`,
      "SegmentGroups": {
        "Groups": [
          {
            "Dimensions": [
              {
                "Demographic": {
                  "Channel": {
                    "DimensionType": "INCLUSIVE",
                    "Values": [
                      segment.channelID
                    ]
                  }
                }
              },
              {
                "UserAttributes": {}
              }
            ]
          }
        ],
        "Include": "ALL"
      }
    };

    templateSegment.SegmentGroups.Groups[0].Dimensions[1].UserAttributes[segment.publicationID] = {
      "AttributeType": "INCLUSIVE",
      "Values": [
        segment.channelID
      ]
    };
    
    var params = {
      ApplicationId: projectID,
      WriteSegmentRequest: templateSegment
    };

    pinpoint.createSegment(params, function(err, data) {
      if (err) {
        console.log("createSegmentFailure", err);
        reject(err);
      } else {
        console.log("createSegmentSuccess", data);
        resolve(data);
      }     
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
exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    // Translate into something more sane to read.
    var newImage = dynamodbTranslator.translateOutput(record.dynamodb.NewImage, ItemShape);
    console.log('DynamoDB NewImage: %j', newImage);

    // Build Segments
    var segments = [];
    newImage.categories.forEach(function (category, index) {
      category.publications.forEach(function (publication, index) {
        newImage.availableChannels.forEach(function (channel, index) {
          segments.push({
            'publicationID': publication.id,
            'channelID': channel.id
          });
        });
      });
    });

    getSegments(newImage.projectID)
    .then( function(existingSegments) {
      console.log(JSON.stringify(existingSegments, null, 2));

      var segmentsToCreate = [];
      segments.forEach(function (segment, index) {
        var found = false;
        existingSegments.forEach(function (existingSegment, index) {
          var segmentName = `PC_${newImage.preferenceCenterID}_${segment.publicationID}_${segment.channelID}`;
          if(existingSegment.Name === segmentName) {
            found = true;
          }
        });
        if(!found) segmentsToCreate.push(segment);
      });

      console.log(JSON.stringify(segmentsToCreate, null, 2));
      return createSegments(newImage.projectID, newImage.preferenceCenterID, segmentsToCreate);
    })
    .then(function(results){
      callback(null, `Successfully processed ${event.Records.length} records.`);
    })
    .catch(function(err){
      //TODO: what do I do with this?
      console.log(err);
      callback(null, `Error`);
    });
  }
};
