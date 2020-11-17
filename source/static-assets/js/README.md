## Functions

<dl>
<dt><a href="#getMetadata">getMetadata()</a> ⇒ <code>Object</code></dt>
<dd><p>Retrieves all endpoints for a given UserID</p>
</dd>
<dt><a href="#loadMetadata">loadMetadata()</a></dt>
<dd><p>Compiles handlebars template to populate preference center html</p>
</dd>
<dt><a href="#getEndpoints">getEndpoints(projectID, userID)</a> ⇒ <code>Array</code></dt>
<dd><p>Retrieves all endpoints for a given UserID</p>
</dd>
<dt><a href="#loadUser">loadUser()</a></dt>
<dd><p>Loads retrieved user data into preference center form</p>
</dd>
<dt><a href="#upsertEndpoints">upsertEndpoints()</a></dt>
<dd><p>Orchestrates the process to read form data, show spinners, and call REST API</p>
</dd>
<dt><a href="#upsertUser">upsertUser()</a> ⇒ <code>Array</code></dt>
<dd><p>Calls REST API to upsert a user</p>
</dd>
<dt><a href="#readFormData">readFormData()</a></dt>
<dd><p>Reads form data and updates endpoints collection with user entered values</p>
</dd>
<dt><a href="#showLoader">showLoader()</a></dt>
<dd><p>Shows initial full page loader</p>
</dd>
<dt><a href="#hideLoader">hideLoader()</a></dt>
<dd><p>Hides initial full page loader</p>
</dd>
<dt><a href="#showProgress">showProgress()</a></dt>
<dd><p>Shows ajax spinner during endpoint updates</p>
</dd>
<dt><a href="#hideProgress">hideProgress()</a></dt>
<dd><p>Hides ajax spinner during endpoint updates</p>
</dd>
<dt><a href="#showForm">showForm()</a></dt>
<dd><p>Shows the preference center form after generation</p>
</dd>
<dt><a href="#hideForm">hideForm()</a></dt>
<dd><p>Hides the preference center form</p>
</dd>
<dt><a href="#showError">showError(msg)</a></dt>
<dd><p>Shows the Error growl notification</p>
</dd>
<dt><a href="#showSuccess">showSuccess(msg)</a></dt>
<dd><p>Shows the Success growl notification</p>
</dd>
<dt><a href="#getParameterByName">getParameterByName(name, url)</a> ⇒ <code>String</code></dt>
<dd><p>Parses querystring for values</p>
</dd>
<dt><a href="#registerEvents">registerEvents()</a></dt>
<dd><p>Register jquery events</p>
</dd>
<dt><a href="#registerHelpers">registerHelpers()</a></dt>
<dd><p>Registers Handlebars Helpers</p>
</dd>
</dl>

<a name="getMetadata"></a>

## getMetadata() ⇒ <code>Object</code>
Retrieves all endpoints for a given UserID

**Kind**: global function  
**Returns**: <code>Object</code> - The preference center metadata stored in DynamoDB for the given projectID and preferenceCenterID. 
If preferenceCenterID isn't specified then 'default' will be used.  
<a name="loadMetadata"></a>

## loadMetadata()
Compiles handlebars template to populate preference center html

**Kind**: global function  
<a name="getEndpoints"></a>

## getEndpoints(projectID, userID) ⇒ <code>Array</code>
Retrieves all endpoints for a given UserID

**Kind**: global function  
**Returns**: <code>Array</code> - Collection of user endpoints: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-users-user-id.html#apps-application-id-users-user-id-response-body-endpointsresponse-example  

| Param | Type | Description |
| --- | --- | --- |
| projectID | <code>String</code> | The pinpoint project or application id |
| userID | <code>String</code> | The User.UserID to retrieve |

<a name="loadUser"></a>

## loadUser()
Loads retrieved user data into preference center form

**Kind**: global function  
<a name="upsertEndpoints"></a>

## upsertEndpoints()
Orchestrates the process to read form data, show spinners, and call REST API

**Kind**: global function  
<a name="upsertUser"></a>

## upsertUser() ⇒ <code>Array</code>
Calls REST API to upsert a user

**Kind**: global function  
**Returns**: <code>Array</code> - Collection of updated user endpoints with generated userIDs and endpointIDs for new users.  
<a name="readFormData"></a>

## readFormData()
Reads form data and updates endpoints collection with user entered values

**Kind**: global function  
<a name="showLoader"></a>

## showLoader()
Shows initial full page loader

**Kind**: global function  
<a name="hideLoader"></a>

## hideLoader()
Hides initial full page loader

**Kind**: global function  
<a name="showProgress"></a>

## showProgress()
Shows ajax spinner during endpoint updates

**Kind**: global function  
<a name="hideProgress"></a>

## hideProgress()
Hides ajax spinner during endpoint updates

**Kind**: global function  
<a name="showForm"></a>

## showForm()
Shows the preference center form after generation

**Kind**: global function  
<a name="hideForm"></a>

## hideForm()
Hides the preference center form

**Kind**: global function  
<a name="showError"></a>

## showError(msg)
Shows the Error growl notification

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>String</code> | The message to display in the notification |

<a name="showSuccess"></a>

## showSuccess(msg)
Shows the Success growl notification

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>String</code> | The message to display in the notification |

<a name="getParameterByName"></a>

## getParameterByName(name, url) ⇒ <code>String</code>
Parses querystring for values

**Kind**: global function  
**Returns**: <code>String</code> - The querystring value  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | The querystring value to retrieve |
| url | <code>String</code> | The url to search |

<a name="registerEvents"></a>

## registerEvents()
Register jquery events

**Kind**: global function  
<a name="registerHelpers"></a>

## registerHelpers()
Registers Handlebars Helpers

**Kind**: global function  
