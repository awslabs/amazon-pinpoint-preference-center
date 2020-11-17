const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda({'region':'us-east-1'}); //Need edge functions to goto us-east-1
const s3 = new AWS.S3();
const url = require('url');
const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const replace = require('replace-in-file');
const mime = require('mime-types');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const JSZip = require("jszip");
const shortid = require('shortid');

/****************
 * Helper Functions
 */

function putMetadata(tableName, projectID, hashKey) {
  return new Promise(function(resolve,reject){
    console.log("putMetadata");

    var params = require('./metadata-template.json');
    params.TableName = tableName;
    params.Item.projectID = projectID;
    params.Item.hashKey = hashKey;

    dynamo.put(params, function(err, data) { 
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log("putMetadata Success!");
        resolve(data);
      }
    });
  });
}

function getAPIKey(apiKeyID) {
  return new Promise(function(resolve,reject){
    console.log("getAPIKey");
    var apigateway = new AWS.APIGateway();
    var params = {
      apiKey: apiKeyID,
      includeValue: true
    };

    apigateway.getApiKey(params, function(err, ApiKeyData) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        reject(err);
      } else {
        console.log("getAPIKey Success");
        console.log(ApiKeyData.value);      // successful response
        resolve(ApiKeyData.value);
      }
    });
  });
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fileSubstitutions(event, tempDir) {
  return new Promise(function(resolve,reject){
    try{
      
      console.log(tempDir);
      
      //Copy files out of Layer
      fs.copySync('/opt', tempDir);

      //What files were moved
      walkDir(tempDir, function(filePath) {
        //const fileContents = fs.readFileSync(filePath, 'utf8');
        console.log(filePath);
      });
      
      //File Substitutions
      if (event.ResourceProperties.Substitutions) {
          
        //File Patterns
        var files = event.ResourceProperties.Substitutions.FilePattern.split(',');
        
        files.forEach(function(file,index) {
          files[index] = `${tempDir}/**/${file}`;
        });
        
        //Values to Replace
        var from = [];
        var to = [];

        Object.keys(event.ResourceProperties.Substitutions.Values).forEach(function(key) {
          var val = event.ResourceProperties.Substitutions.Values[key];
          from.push(new RegExp('\\${' + key + '}', 'g'));
          to.push(val);
        });
        
        var options = {
          files: files,
          from: from,
          to: to,
          countMatches: true,
        };
        
        console.log(options);
        
        //const results = await replace(options);

        replace(options)
        .then(function (results){
          console.log('Replacement results:', JSON.stringify(results));
          resolve(results);
        })
        .catch(function(err){
          console.log(err);
          reject(err);
        });
      } else {
        resolve();
      }
    } catch (err){
      console.log(err);
      reject(err);
    }
  });
}

function buildEdgeFunction(roleARN, edgeFunctionName, apiGatewayURL){
  return new Promise(function(resolve,reject){
    try{
      console.log("lambda_create_function");
        
      var zip = new JSZip();
      var lambdaCode = `'use strict';

exports.handler = async (event, context, callback) => {
const response = event.Records[0].cf.response;
const headers = response.headers;

headers['Strict-Transport-Security'] = [{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload',
}];

headers['X-XSS-Protection'] = [{
  key: 'X-XSS-Protection',
  value: '1; mode=block',
}];

headers['X-Content-Type-Options'] = [{
  key: 'X-Content-Type-Options',
  value: 'nosniff',
}];

// headers['X-Frame-Options'] = [{
//     key: 'X-Frame-Options',
//     value: 'SAMEORIGIN',
// }];

headers['Referrer-Policy'] = [{ key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' }];

headers['Content-Security-Policy'] = [{
  key: 'Content-Security-Policy',
  value: "upgrade-insecure-requests;default-src 'self'; img-src 'self' ; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; object-src 'none'; connect-src 'self' ${apiGatewayURL}",
}];

callback(null, response);
};`;

      zip.file("index.js", lambdaCode);

      zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
      .pipe(fs.createWriteStream('/tmp/function.zip'))
      .on('finish', function () {
          // JSZip generates a readable stream with a "end" event,
          // but is piped here in a writable stream which emits a "finish" event.
          console.log("function.zip written.");

          var params = {
            Code: {
              ZipFile: fs.readFileSync('/tmp/function.zip')
            }, 
            Description: "Preference Center Lambda Edge Secure Header Function", 
            FunctionName: edgeFunctionName, 
            Handler: "index.handler", 
            MemorySize: 128, 
            Publish: true, 
            Role: roleARN, 
            Runtime: "nodejs12.x", 
            Timeout: 5
          };

          lambda.createFunction(params, function(err, data) {
            if (err) {
              console.log(err, err.stack); // an error occurred
              reject(err);
            } else {
              console.log(data); // successful response
              resolve(`${data.FunctionArn}:${data.Version}`);
            }   
          });

      });
    } catch (err){
      console.log(err);
      reject(err);
    }
  });
}

/****************
 * Main
 */

exports.handler =  async (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try{
      if (event.RequestType == 'Create' || event.RequestType == 'Update'){

        switch (event.LogicalResourceId) {
          case 'CreateUniqueID':
            return sendResponse(event, context.logStreamName, 'SUCCESS', {'solutionUUID': uuidv4()});

          case 'BaseDynamoDBData':
            // Note: this is just being used to hash the User.UserId in the url
            // to prevent url walking to mine preference center data. It's not a critical
            // secret and the customer should be able to change it if needed.
            var hashKey = crypto.randomBytes(20).toString('hex');
            let metadataResults = await putMetadata(event.ResourceProperties.DynamoTableName, event.ResourceProperties.PinpointProjectID, hashKey);
            return sendResponse(event, context.logStreamName, 'SUCCESS', {'hashKey':hashKey});

          case 'GetAPIKey':
            let apiKey = await getAPIKey(event.ResourceProperties.ApiKeyID);
            return sendResponse(event, context.logStreamName, 'SUCCESS', {'apiKey':apiKey});

          case 'DeployLambdaEdgeFunction':
            let edgeFunctionVersionARN = await buildEdgeFunction(event.ResourceProperties.EdgeFunctionRoleARN, `${event.ResourceProperties.EdgeFunctionName}-${shortid.generate()}`, event.ResourceProperties.APIGatewayURL);
            //let edgeFunctionVersionARN = await buildEdgeFunction(event.ResourceProperties.EdgeFunctionRoleARN, event.ResourceProperties.EdgeFunctionName);
            return sendResponse(event, context.logStreamName, 'SUCCESS', {'edgeFunctionVersionARN':edgeFunctionVersionARN});      
          
          case 'PutStaticFiles':
            var tempDir = `/tmp/${context.awsRequestId}`;
            event.ResourceProperties.Substitutions.Values.API_KEY = event.ResourceProperties.ApiKey;
            let fileSubstitutionResults = await fileSubstitutions(event, tempDir, event.ResourceProperties.ApiKey);
        
            //Upload to S3
            var filesToUpload = [];
            var bucketName = event.ResourceProperties.TargetBucket;
            walkDir(tempDir, function(filePath) {
              //TFilter out IgnoreFiles
              if(event.ResourceProperties.Substitutions.IgnoreFiles && event.ResourceProperties.Substitutions.IgnoreFiles.indexOf(path.basename(filePath)) == -1){
                var mimeType = mime.contentType(path.extname(filePath));
                filesToUpload.push({'path': filePath, 'mimeType': mimeType});
              }
            });
            
            for (const file of filesToUpload) {
              let bucketPath = file.path.replace(`${tempDir}/`,'');
              const params = {
                Bucket: bucketName,
                Key: bucketPath,
                ACL: event.ResourceProperties.Acl,
                ContentType: file.mimeType,
                Body: fs.readFileSync(file.path)
              };
              try {
                const stored = await s3.upload(params).promise();
                console.log(JSON.stringify(stored));
              } catch (err) {
                console.log(err);
              }
            }

            //Cleanup
            fs.removeSync(tempDir);

            return sendResponse(event, context.logStreamName, 'SUCCESS', {});

          default:
            return sendResponse(event, context.logStreamName, 'SUCCESS', {});

        }
      } else {
        return sendResponse(event, context.logStreamName, 'SUCCESS', {});
      }
    }
    catch (ex){
      console.log(JSON.stringify(ex));
      return sendResponse(event, context.logStreamName, 'FAILED', {});
    }
};

/**
* Sends a response to the pre-signed S3 URL
*/
let sendResponse = function(event, logStreamName, responseStatus, responseData) {
  return new Promise((resolve, reject) => {
    try {
      const responseBody = JSON.stringify({
          Status: responseStatus,
          Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
          PhysicalResourceId: logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: responseData,
      });

      console.log('RESPONSE BODY:\n', responseBody);
      const parsedUrl = url.parse(event.ResponseURL);
      const options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.path,
          method: 'PUT',
          headers: {
              'Content-Type': '',
              'Content-Length': responseBody.length,
          }
      };

      const req = https.request(options, (res) => {
          console.log('STATUS:', res.statusCode);
          console.log('HEADERS:', JSON.stringify(res.headers));
          resolve('Successfully sent stack response!');
      });

      req.on('error', (err) => {
          console.log('sendResponse Error:\n', err);
          reject(err);
      });

      req.write(responseBody);
      req.end();

    } catch(err) {
      console.log('GOT ERROR');
      console.log(err);
      reject(err);
    }
  });
};
