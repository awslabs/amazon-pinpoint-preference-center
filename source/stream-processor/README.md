<a name="module_preferenceCenterStreamProcessor"></a>

## preferenceCenterStreamProcessor
**Version**: 1.0.0  
**Author**: davelem  

* [preferenceCenterStreamProcessor](#module_preferenceCenterStreamProcessor)
    * _static_
        * [.handler(event, context, callback)](#module_preferenceCenterStreamProcessor.handler)
    * _inner_
        * [~getSegments(projectId)](#module_preferenceCenterStreamProcessor..getSegments) ⇒ <code>Promise</code>
        * [~createSegments(projectId, segments)](#module_preferenceCenterStreamProcessor..createSegments) ⇒ <code>Promise</code>
        * [~createSegment(projectId, segment)](#module_preferenceCenterStreamProcessor..createSegment) ⇒ <code>Promise</code>

<a name="module_preferenceCenterStreamProcessor.handler"></a>

### preferenceCenterStreamProcessor.handler(event, context, callback)
Main Lambda Handler...Start Here.

**Kind**: static method of [<code>preferenceCenterStreamProcessor</code>](#module_preferenceCenterStreamProcessor)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>Object</code> | The Lambda event object |
| context | <code>Object</code> | The Lambda Context Object |
| callback | <code>Array.&lt;Object&gt;</code> | The lambda callback method to execute when the function completes |

<a name="module_preferenceCenterStreamProcessor..getSegments"></a>

### preferenceCenterStreamProcessor~getSegments(projectId) ⇒ <code>Promise</code>
Gets all segments for a given project/application ID

**Kind**: inner method of [<code>preferenceCenterStreamProcessor</code>](#module_preferenceCenterStreamProcessor)  
**Returns**: <code>Promise</code> - A Promise object that contatins segments  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |

<a name="module_preferenceCenterStreamProcessor..createSegments"></a>

### preferenceCenterStreamProcessor~createSegments(projectId, segments) ⇒ <code>Promise</code>
Creates a collection of segments synchronously to avoid hammering the API

**Kind**: inner method of [<code>preferenceCenterStreamProcessor</code>](#module_preferenceCenterStreamProcessor)  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| segments | <code>Array.&lt;String&gt;</code> | The segments to create |

<a name="module_preferenceCenterStreamProcessor..createSegment"></a>

### preferenceCenterStreamProcessor~createSegment(projectId, segment) ⇒ <code>Promise</code>
Creates a pinpoint segment

**Kind**: inner method of [<code>preferenceCenterStreamProcessor</code>](#module_preferenceCenterStreamProcessor)  

| Param | Type | Description |
| --- | --- | --- |
| projectId | <code>String</code> | The pinpoint application/project id to associate the events with |
| segment | <code>Array.&lt;String&gt;</code> | The segment to create |

