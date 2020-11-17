<a name="module_preferenceCenterHandler"></a>

## preferenceCenterHandler
**Version**: 1.0.0  
**Author**: davelem  

* [preferenceCenterHandler](#module_preferenceCenterHandler)
    * _static_
        * [.handler(event, context, callback)](#module_preferenceCenterHandler.handler)
    * _inner_
        * [~createPinpointEvent(preferenceCenterID, eventType, endpoint, attributes)](#module_preferenceCenterHandler..createPinpointEvent) ⇒ <code>Object</code>
        * [~processEvents(projectId, events, endpoint, attributes)](#module_preferenceCenterHandler..processEvents) ⇒ <code>Promise</code>
        * [~getMetadata(projectId, preferenceCenterID)](#module_preferenceCenterHandler..getMetadata) ⇒ <code>Promise</code>
        * [~getUserEndpoints(projectId, userID)](#module_preferenceCenterHandler..getUserEndpoints) ⇒ <code>Promise</code>
        * [~upsertEndpoints(projectId, endpoints)](#module_preferenceCenterHandler..upsertEndpoints) ⇒ <code>Promise</code>
        * [~upsertEndpoint(projectId, [userID], endpoints)](#module_preferenceCenterHandler..upsertEndpoint) ⇒ <code>Promise</code>

<a name="module_preferenceCenterHandler.handler"></a>

### preferenceCenterHandler.handler(event, context, callback)
Main Lambda Handler...Start Here.

**Kind**: static method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>Object</code> | The Lambda event object |
| context | <code>Object</code> | The Lambda Context Object |
| callback | <code>Array.&lt;Object&gt;</code> | The lambda callback method to execute when the function completes |

<a name="module_preferenceCenterHandler..createPinpointEvent"></a>

### preferenceCenterHandler~createPinpointEvent(preferenceCenterID, eventType, endpoint, attributes) ⇒ <code>Object</code>
Formats a custom Pinpoint event

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  
**Returns**: <code>Object</code> - Returns a pinpoint custom event object  

| Param | Type | Description |
| --- | --- | --- |
| preferenceCenterID | <code>String</code> | The preference center id |
| eventType | <code>String</code> | A pinpoint event type |
| endpoint | <code>Object</code> | The pinpoint project or application id |
| attributes | <code>Object</code> | Custom attributes to add to pinpoint event |

<a name="module_preferenceCenterHandler..processEvents"></a>

### preferenceCenterHandler~processEvents(projectId, events, endpoint, attributes) ⇒ <code>Promise</code>
Writes a batch of custom pinpoint events

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| events | <code>Array</code> | Collection of custom events to add |
| endpoint | <code>Object</code> | The pinpoint project or application id |
| attributes | <code>Object</code> | Custom attributes to add to pinpoint event |

<a name="module_preferenceCenterHandler..getMetadata"></a>

### preferenceCenterHandler~getMetadata(projectId, preferenceCenterID) ⇒ <code>Promise</code>
Writes a batch of custom pinpoint events

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  
**Returns**: <code>Promise</code> - A Promise object that contatins the metadata retrieved from DynamoDB  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| preferenceCenterID | <code>String</code> | The preference center id |

<a name="module_preferenceCenterHandler..getUserEndpoints"></a>

### preferenceCenterHandler~getUserEndpoints(projectId, userID) ⇒ <code>Promise</code>
Writes a batch of custom pinpoint events

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  
**Returns**: <code>Promise</code> - A Promise object that contatins a collection of user endpoints  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| userID | <code>String</code> | The User.UserID to retrieve |

<a name="module_preferenceCenterHandler..upsertEndpoints"></a>

### preferenceCenterHandler~upsertEndpoints(projectId, endpoints) ⇒ <code>Promise</code>
Upserts a collection of endpoints synchronously to avoid hammering the API

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  
**Returns**: <code>Promise</code> - A Promise object that returns the User.ID.  If it was a new user then this will contain the UUID that was generated  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| endpoints | <code>Array.&lt;Object&gt;</code> | The endpoints to upsert |

<a name="module_preferenceCenterHandler..upsertEndpoint"></a>

### preferenceCenterHandler~upsertEndpoint(projectId, [userID], endpoints) ⇒ <code>Promise</code>
Writes a batch of custom pinpoint events

**Kind**: inner method of [<code>preferenceCenterHandler</code>](#module_preferenceCenterHandler)  
**Returns**: <code>Promise</code> - A Promise object that contatins a collection of user endpoints  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| projectId | <code>String</code> |  | The pinpoint application/project id to associate the events with |
| [userID] | <code>String</code> | <code>UUID</code> | userID The User.UserID to retrieve will default to new UUID if not specified |
| endpoints | <code>Array.&lt;Object&gt;</code> |  | The endpoints to upsert |

