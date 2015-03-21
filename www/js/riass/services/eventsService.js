angular.module( 'riass' )
	.service( 'eventsService', [ '$rootScope', '$q', '$http', '$timeout', '$document', 'settingsService', function( $rootScope, $q, $http, $timeout, $document, settingsService ){
		var
			EVENT_TYPES = {
				WIDGET_CREATED            : 1,
				WIDGET_UPDATED            : 2,
				WIDGET_DELETED            : 3,
				WIDGET_TIMELINE_PUBLISHED : 4,
				NEW_PHOTO                 : 5,
				SETTING_CHANGED           : 6,
				WIDGET_TIMELINE_PRELOADED : 7,
				WIDGET_TIMELINE_REMOVED   : 8,
				WIDGET_PRELOADED          : 9,
				WIDGET_PUBLISHED          : 10,
				BCAST_STARTED             : 11,
				BCAST_STOPPED             : 12
			},
			EVENT_NAMES = {
				WIDGET_CREATED            : 'widgetCreated',
				WIDGET_UPDATED            : 'widgetUpdated',
				WIDGET_DELETED            : 'widgetDeleted',
				WIDGET_TIMELINE_PUBLISHED : 'widgetTimelinePublished',
				NEW_PHOTO                 : 'newPhoto',
				SETTING_CHANGED           : 'settingChanged',
				WIDGET_TIMELINE_PRELOADED : 'widgetTimelinePreloaded',
				WIDGET_TIMELINE_REMOVED   : 'widgetTimelineRemoved',
				WIDGET_PRELOADED          : 'widgetPreloaded',
				WIDGET_PUBLISHED          : 'widgetPublished',
				BCAST_STARTED             : 'bcastStarted',
				BCAST_STOPPED             : 'bcastStopped'
			},
			_eventNameByType = (function(){
				var res = {};
				angular.forEach( EVENT_TYPES, function( type, key ){
					res[ type ] = EVENT_NAMES[ key ];
				} )
				return res;
			})(),
			_eventTypeByName = (function(){
				var res = {};
				angular.forEach( EVENT_TYPES, function( type, key ){
					res[ EVENT_NAMES[ key ] ] = type;
				} )
				return res;
			})(),
			_lastId = 0,
			_initDefer = $q.defer(),
			_loadDefer,
			_loadTimer,
			_data = {
				loadInterval : 100000, //XXX in real life it could be much often
				offline : $rootScope.CONFIG && $rootScope.CONFIG.offline
			},
			_state = {
				loading : false
			},
			EventsMachine = (function(){
				var
					dispatcher = $document,
					/**
					 * Hash of special handlers for any types of events
					 * (types not names!)
					 * Each of registered here handlers has to be represented as
					 * object structured like defaultHandler below
					 */
						handlersByType = {},
					defaultHandler = {
						on      : function( eventName, listener ){
							on( getEventName( eventName ), listener );
						},
						off     : function( eventName, listener ){
							off( getEventName( eventName ), listener );
						},
						trigger : function( eventData, eventType, eventUser ){
							trigger( getEventName( _eventNameByType[ eventType ] ), [ eventData, eventUser ] );
						}
					};

				// SETTINGS_CHANGES event handler
				handlersByType[ EVENT_TYPES.SETTING_CHANGED ] = (function(){
					var handler = {};

					handler.on = function( eventName, listener, filter ){
						on( getEventName( eventName, _.pick( filter || {}, 'key' ) ), listener );
					}
					handler.off = function( eventName, listener, filter ){
						off( getEventName( eventName, _.pick( filter || {}, 'key' ) ), listener );
					}

					handler.trigger = function( eventData, eventType, eventUser ){
						trigger(
							getEventName( EVENT_NAMES.SETTING_CHANGED ),
							[ eventData.data || {}, eventUser, eventData.key ]
						);
						if ( eventData.key ){
							eventData.key = settingsService.decodeKey( eventData.key );
							trigger(
								getEventName( EVENT_NAMES.SETTING_CHANGED, { key : eventData.key } ),
								[ eventData.data || {}, eventUser, eventData.key ]
							);
						}
					}

					return handler;
				})();

				function getEventName( eventName, args ){
					var
						res = [ 'event' ],
						eventFamily,
						p;
					if ( eventName ){
						p = eventName.split( '.' );
						if ( p.length > 1 ){
							eventName = p.shift();
							eventFamily = '.' + p.join( '.' );
						}
						res.push( eventName );
					}
					if ( angular.isObject( args ) ){
						angular.forEach( args, function( value, key ){
							res.push( key, value );
						} );
					}
					return res.join( ':' );
				}

				function trigger( eventName, eventData ){
					dispatcher.trigger.apply( dispatcher, arguments );
				}

				function on( eventName, listener ){
					dispatcher.on.apply( dispatcher, arguments );
				}

				function off( eventName, listener ){
					dispatcher.off( eventName, listener );
				}

				return {
					handleEvent : function( event ){
						var
							triggerHandler;
						if ( ! event.type ){
							/* Broken event, nothing to handle */
							return;
						}
						/**
						 * Triggering base 'unnamed' event
						 * If someone want to listen _all_ events, he can subscribe to
						 * event with empty name and get 'em
						 */
						trigger( getEventName(), event.data );
						if ( ! ( event.type in _eventNameByType ) ){
							/*
							 * Unknown event type. There are no handlers for unknown type.
							 * But we've triggered base 'unnamed' event, so it could be catched.
							 * Nothing to do then.
							 */
							return;
						}
						triggerHandler = handlersByType[ event.type ] && handlersByType[ event.type ].trigger
							? handlersByType[ event.type ].trigger
							: defaultHandler.trigger;
						triggerHandler( event.data, event.type, event.user );
					},
					on          : function( eventName, listener ){
						var
							handler,
							eventType = _eventTypeByName[ eventName ];
						if ( ! eventType ){
							throw new Error( 'Cannot subscribe for unknown event ', eventName )
						}
						if ( ! ( handler = handlersByType[ eventType ] ) || ! handler.on ){
							handler = defaultHandler;
						}
						handler.on.apply( handler, arguments );
					},
					off         : function( eventName ){
						var
							handler,
							eventType = _eventTypeByName[ eventName ];
						if ( ! eventType ){
							throw new Error( 'Cannot unsubscribe from unknown event ', eventName )
						}
						if ( ! ( handler = handlersByType[ eventType ] ) || ! handler.off ){
							handler = defaultHandler;
						}
						handler.off.apply( handler, arguments );
					}
				};
			})(),
			eventsService = {
				state  : _state,
				EVENTS : EVENT_NAMES
			};

		eventsService.init = function(){
			_lastId = $rootScope.lastEventId || 0;
			$timeout( resetLoading, 3000 );
			_initDefer.resolve();
			return _initDefer.promise;
		}

		eventsService.on = _.bind( EventsMachine.on, EventsMachine );
		eventsService.off = _.bind( EventsMachine.off, EventsMachine );

		function load(){
			_state.loading = true;

			abortCurrentLoading();
			_loadDefer = $q.defer();

			$http.get( $rootScope.__getUrl( '//API/events' ), {
				params  : {
					lastId : _lastId
				},
				timeout : _loadDefer.promise
			} )
				.then( function( res ){
					var data = res.data.data;
					if ( ! data ){
						/* Empty answer, not interesting */
						return;
					}
					if ( data.lastId ){
						_lastId = data.lastId;
					}
					if ( angular.isArray( data.events ) ){
						/* Wow, new events here. Let's see */
						angular.forEach( data.events, _.bind( EventsMachine.handleEvent, EventsMachine ) );
					}
				} )
				.finally( function(){
					_state.loading = false;
					resetLoading();
				} )

		}

		function abortCurrentLoading(){
			if ( _loadDefer ){
				_loadDefer.resolve();
			}
		}

		function resetLoading(){
			if ( _loadTimer ){
				$timeout.cancel( _loadTimer );
			}
			if ( ! _data.offline ){
				_loadTimer = $timeout( load, _data.loadInterval );
			}
		}


		return eventsService;
	} ] );