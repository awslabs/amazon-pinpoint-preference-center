const apiKey = '${API_KEY}'
const baseURL = '${API_URL}'
const projectID = getParameterByName('pid') 
const preferenceCenterID = getParameterByName('pcid') 
const userID = getParameterByName('uid')
const hash = getParameterByName('h')

var metadata = {}
var endpoints = []

/**
 * START HERE:  The jquery event that fires following js and css loading
 */
$(document).ready(function () {
  registerHelpers()
  registerEvents()

  //Get and load preference center metadata
  getMetadata().then(function (returnedMetadata) {
    metadata = returnedMetadata
    return getEndpoints()
  }).then(function (returnedEndpoints) {
    endpoints = returnedEndpoints
    loadMetadata()
    loadUser()

    // Input Masks
    $(':input').inputmask()

    // Form Validation
    $('#form').validetta({
      display: 'bubble',
      bubblePosition: 'bottom',
      errorClass: 'validetta-error',
      realTime: true
    }, metadata.text.inputValidationMessages)

    //Tooltips
    tlite(el => el.classList.contains('tooltip'));

    hideLoader()
    showForm()
  }).catch(function (e) {
    console.error('Error:', e)
    hideLoader()
    showError('There was an error loading the preference center.')
  })
})

/**
 * Retrieves all endpoints for a given UserID
 * @return {Object} The preference center metadata stored in DynamoDB for the given projectID and preferenceCenterID. 
 * If preferenceCenterID isn't specified then 'default' will be used.
 */
function getMetadata () {
  return new Promise(function (resolve, reject) {
    if (projectID) {
      // Update mode
      var requestUrl = baseURL + projectID + '?pcid=' + preferenceCenterID
      $.ajax({
        url: requestUrl,
        type: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      }).done(function (json) {
        if (json) {
          resolve(json)
        } else {
          reject(new Error('Received invalid json from service'))
        }
      }).fail(function (error) {
        reject(error)
      })
    } else {
      reject(new Error('projectID is required'))
    }
  })
}

/**
 * Compiles handlebars template to populate preference center html
 */
function loadMetadata () {
  var source = $('#template-main-content').html()
  var template = Handlebars.compile(source)
  $('#content').html(template(metadata))
}

/**
 * Retrieves all endpoints for a given UserID
 * @param  {String} projectID The pinpoint project or application id
 * @param  {String} userID The User.UserID to retrieve
 * @return {Array} Collection of user endpoints: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-users-user-id.html#apps-application-id-users-user-id-response-body-endpointsresponse-example
 */
function getEndpoints () {
  return new Promise(function (resolve, reject) {
    if (projectID) {
      // Update mode
      var requestUrl = baseURL + projectID + '/users/' + userID + '?pcid=' + preferenceCenterID + '&h=' + hash
      $.ajax({
        url: requestUrl,
        type: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      }).done(function (json) {
        if (json) {
          resolve(json)
        } else {
          reject(new Error('Received invalid json from service'))
        }
      }).fail(function (error) {
        reject(error)
      })
    } else {
      reject(new Error('projectID is required'))
    }
  })
}

/**
 * Loads retrieved user data into preference center form
 */
function loadUser () {
  // Endpoint Addresses
  endpoints.forEach(function (endpoint, index) {
    $('.user-endpoint-input').each(function (address, index) {
      if ($(this).data('attribute') === endpoint.ChannelType) {
        $(this).val(endpoint.Address)
        $(this).data('endpointid', endpoint.Id)
      }
    })
  })

  // User Attributes
  if (endpoints.length) {
    var userAttributes = endpoints[0].User.UserAttributes

    // Textboxes and Dropdowns
    $('.user-attribute-input').each(function (attribute, index) {
      for (const property in userAttributes) {
        if ($(this).data('attribute') === property) {
          $(this).val(userAttributes[property])
        }
      }
    })

    // Radio Buttons
    $('.user-attribute-radio').each(function (attribute, index) {
      for (const property in userAttributes) {
        if ($(this).attr('name') === property) {
          if (userAttributes[property].indexOf($(this).val()) > -1) {
            $(this).prop('checked', true)
          }
        }
      }
    })

    // Checkboxes
    $('.user-attribute-checkbox').each(function (attribute, index) {
      for (const property in userAttributes) {
        if ($(this).attr('name') === property) {
          if (userAttributes[property].indexOf($(this).val()) > -1) {
            $(this).prop('checked', true)
          }
        }
      }
    })

    // Publications
    metadata.categories.forEach(function (category, index) {
      category.publications.forEach(function (publication, index) {
        $('.publication_' + publication.id).each(function (attribute, index) {
          for (const property in userAttributes) {
            if ($(this).attr('name') === property) {
              if (userAttributes[property].indexOf($(this).val()) > -1) {
                $(this).prop('checked', true)
              }
            }
          }
        })
      })
    })
  }
}

/**
 * Orchestrates the process to read form data, show spinners, and call REST API
 */
function upsertEndpoints () {

  showProgress()
  readFormData()

  upsertUser().then(function (returnedEndpoints) {
    endpoints = returnedEndpoints
    loadUser()
    hideProgress()
    showSuccess(metadata.text.successText)
  }).catch(function (e) {
    console.error('Error:', e)
    hideProgress()
    showError(metadata.text.errorText)
  })
}

/**
 * Calls REST API to upsert a user
 * @return {Array} Collection of updated user endpoints with generated userIDs and endpointIDs for new users.
 */
function upsertUser () {
  return new Promise(function (resolve, reject) {
    // Update mode
    var requestUrl = baseURL + projectID + '/users'
    $.ajax({
      url: requestUrl,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(endpoints),
      headers: {
        'x-api-key': apiKey
      }
    })
      .done(function (json) {
        if (json) {
          resolve(json)
        } else {
          reject(new Error('Received invalid json from service'))
        }
      })
      .fail(function (error) {
        console.error(error)
        reject(error)
      })
  })
}

/**
 * Reads form data and updates endpoints collection with user entered values
 */
function readFormData () {
  // Endpoint Addresses
  $('.user-endpoint-input').each(function (address, index) {
    var endpointID = ''
    if ($(this).data('endpointid')) {
      // Existing Endpoint, so update
      endpointID = $(this).data('endpointid')
      var endpointInput = this
      endpoints.forEach(function (endpoint, index) {
        if (endpointID === endpoint.Id) {
            endpoint.Address = $(endpointInput).val()
        }
      })
    } else if ($(this).val()) {
      // New Endpoint, so create new endpoint
      var tmpAddress = ''
        tmpAddress = $(this).val()
      endpoints.push({
        Address: tmpAddress,
        ChannelType: $(this).data('attribute'),
        User: {
          UserAttributes: {}
        }
      })
    }
  })

  // Build temporary attributes object
  var tmpAttributes = {}
  metadata.attributes.forEach(function (attribute, index) {
    tmpAttributes[attribute.id] = []
  })

  metadata.categories.forEach(function (category, index) {
    category.publications.forEach(function (publication, index) {
      tmpAttributes[publication.id] = []
    })
  })

  // Textboxes and Dropdowns
  $('.user-attribute-input').each(function (attribute, index) {
    for (const property in tmpAttributes) {
      if ($(this).data('attribute') === property) {
        if ($(this).data('inputmask')) {
          // We have an input mask so grab unmasked value
          tmpAttributes[property].push($(this).inputmask('unmaskedvalue'))
        } else {
          tmpAttributes[property].push($(this).val())
        }
      }
    }
  })

  // Radio Buttons
  $('.user-attribute-radio').each(function (attribute, index) {
    for (const property in tmpAttributes) {
      if ($(this).attr('name') === property) {
        if ($(this).prop('checked') && tmpAttributes[property].indexOf($(this).val()) < 0) {
          tmpAttributes[property].push($(this).val())
        }
      }
    }
  })

  // Checkboxes
  $('.user-attribute-checkbox').each(function (attribute, index) {
    for (const property in tmpAttributes) {
      if ($(this).attr('name') === property) {
        if ($(this).prop('checked')) {
          tmpAttributes[property].push($(this).val())
        }
      }
    }
  })

  // Publications
  metadata.categories.forEach(function (category, index) {
    category.publications.forEach(function (publication, index) {
      $('.publication_' + publication.id).each(function (attribute, index) {
        for (const property in tmpAttributes) {
          if ($(this).attr('name') === property) {
            if ($(this).prop('checked')) {
              tmpAttributes[property].push($(this).val())

              // If the user opted in to a publication and they were unsubscribed, then set their OptOut flag back to All
              var selectedChannel = $(this).val()
              endpoints.forEach(function (endpoint, index) {
                if(endpoint.ChannelType === selectedChannel) endpoint.OptOut = 'NONE'
              })
            }
          }
        }
      })
    })
  })

  // Update endpoint Users Attributes 
  endpoints.forEach(function (endpoint, index) {
    endpoint.User.UserAttributes = tmpAttributes
  })
}

/**
 * Shows initial full page loader
 */
function showLoader () {
  $('#spinner').show()
}

/**
 * Hides initial full page loader
 */
function hideLoader () {
  $('#spinner').hide()
}

/**
 * Shows ajax spinner during endpoint updates
 */
function showProgress () {
  $('#progress').show()
}

/**
 * Hides ajax spinner during endpoint updates
 */
function hideProgress () {
  $('#progress').hide()
}

/**
 * Shows the preference center form after generation
 */
function showForm () {
  $('#content').show()
}

/**
 * Hides the preference center form
 */
function hideForm () {
  $('#content').hide()
}

/**
 * Shows the Error growl notification
 * @param  {String} msg The message to display in the notification
 */
function showError (msg) {
  $('.error-notification').fadeIn().html('<i class="fas fa-exclamation-circle"></i> ' + msg)
  setTimeout(function () {
    $('.error-notification').fadeOut()
  }, 4000)
}

/**
 * Shows the Success growl notification
 * @param  {String} msg The message to display in the notification
 */
function showSuccess (msg) {
  $('.success-notification').fadeIn().html('<i class="far fa-check-circle"></i> ' + msg)
  setTimeout(function () {
    $('.success-notification').fadeOut()
  }, 4000)
}

/**
 * Parses querystring for values
 * @param  {String} name The querystring value to retrieve
 * @param  {String} url The url to search
 * @return {String}      The querystring value
 */
function getParameterByName (name, url) {
  if (!url) url = window.location.href
  name = name.replace(/[[\]]/g, '\\$&')
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  var results = regex.exec(url)
  if (!results) return ''
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

/**
 * Register jquery events
 */
function registerEvents () {

  //Submit Button
  $(document).on('submit', 'form', function (e) {
    e.preventDefault()
    upsertEndpoints()
    return false
  })

  //Unsub from all
  $(document).on('click', '#unsub-from-all', function (e) {
     
    if ($(this).prop('checked')) {
      $('.publication-checkbox').each(function (attribute, index) {
        $(this).prop('checked', false)
      })

      endpoints.forEach(function (endpoint, index) {
        endpoint.OptOut = 'ALL'
      })
    }
  })
}

/**
 * Registers Handlebars Helpers  
 */
function registerHelpers () {

  /**
   *Builds an input field based on the passed in metadata
   */
  Handlebars.registerHelper('buildInput', function (type, options) {
    var html = ''
    var required = ''

    if (this.required && typeof (this.required) === 'string') {
      required = 'data-validetta="' + this.required + '"'
    } else if (this.required) {
      required = 'data-validetta="required"'
    }

    switch (this.inputType) {
      case 'select':
        html = '<select class="user-attribute-input" data-attribute="' + this.id + '" id="select_' + this.id + '">'
        this.options.forEach((option, index) => {
          html += '<option value="' + option.value + '">' + option.label + '</option>'
        })
        html += '</select>'
        return new Handlebars.SafeString(html)
      case 'checkbox':
        html = '<span class="checkbox-container">'
        this.options.forEach((option, index) => {
          html += '<input type="checkbox" class="user-attribute-checkbox" data-attribute="' + this.id + '" id="checkbox_' + this.id + '_' + index + '" name="' + this.id + '" value="' + option.value + '" ' + required + '> <label class="checkbox-label" for="checkbox_' + this.id + '_' + index + '">' + option.label + '</label>'
        })
        html += '</span>'
        return new Handlebars.SafeString(html)
      case 'radio':
        html = '<span class="radio-container">'
        this.options.forEach((option, index) => {
          html += '<input type="radio" class="user-attribute-radio" data-attribute="' + this.id + '" id="radio_' + this.id + '_' + index + '" name="' + this.id + '" value="' + option.value + '" ' + required + '> <label class="radio-label" for="radio_' + this.id + '_' + index + '">' + option.label + '</label>'
        })
        html += '</span>'
        return new Handlebars.SafeString(html)
      default:
        inputMask = this.inputMask ? 'data-inputmask="' + this.inputMask + '"' : ''
        html = '<input class="user-' + type + '-input" type="text" data-attribute="' + this.id + '" placeholder="' + this.inputPlaceholder + '" id="' + type + '_' + this.id + '_' + options.data.index + '" ' + required + ' ' + inputMask + '/>'
    }
    return new Handlebars.SafeString(html)
  })
}
