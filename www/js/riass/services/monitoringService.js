angular.module( 'riass' )
	.service( 'monitoringService', [ '$rootScope', 'eventsService', function ( $rootScope, eventsService ){
		var
			activities = {},
			isRunning = false,
			bcastToken = 'bcast/' + $rootScope.broadcastingId + '/',
			events = [
				eventsService.EVENTS.WIDGET_CREATED,
				eventsService.EVENTS.WIDGET_UPDATED,
				eventsService.EVENTS.WIDGET_DELETED,
				eventsService.EVENTS.WIDGET_TIMELINE_PUBLISHED,
				eventsService.EVENTS.SETTING_CHANGED,
				eventsService.EVENTS.WIDGET_TIMELINE_PRELOADED,
				eventsService.EVENTS.WIDGET_TIMELINE_REMOVED,
				eventsService.EVENTS.WIDGET_PRELOADED,
				eventsService.EVENTS.WIDGET_PUBLISHED,
				eventsService.EVENTS.BCAST_STARTED,
				eventsService.EVENTS.BCAST_STOPPED
			],
			maxLogLength = 30,
			monitoringService = {
				get activities(){ return activities},
				get activitiesNum(){ return _.keys( activities ).length },
				isRunning : function (){
					return isRunning;
				},
				run       : function (){
					if ( isRunning ){
						return false;
					}
					startListenEvents();
					isRunning = true;
					return true;
				}
			};

		function startListenEvents(){
			angular.forEach( events, function ( eventName ){
				eventsService.on( eventName, function ( event, eventData, user, key ){
					addActivity( user, eventName, eventData, key )
				} )
			} )
		}

		function addActivity( user, eventName, eventData, settingsKey ){
			var
				msg,
				activity;
			if ( ! user || ! user.id ){
				return;
			}
			if ( ! ( user.id in activities ) ){
				activities[ user.id ] = {
					user : user,
					log  : []
				};
			}
			activity = activities[ user.id ];

			msg = getEventReadable( eventName, eventData, settingsKey );
			if ( activity.log[ 0 ] && activity.log[ 0 ].msg == msg ){
				// The same message as previous. Just increase repeat counter.
				activity.log[ 0 ].repeat ++;
				activity.log[ 0 ].date = new Date;
			}
			else {
				// New message
				activities[ user.id ].log.unshift( {
					msg    : msg,
					name   : eventName,
					data   : eventData,
					date   : new Date,
					repeat : 1
				} );
			}

			if ( activities[ user.id ].log.length > maxLogLength ){
				activities[ user.id ].log.pop();
			}

		}

		function getEventReadable( eventName, eventData, settingsKey ){
			var
				m,
				msg = '';
			switch ( eventName ){
				case eventsService.EVENTS.WIDGET_CREATED:
					msg = 'Created widget #<%= id %>';
					break;
				case eventsService.EVENTS.WIDGET_UPDATED:
					msg = 'Changed widget #<%= id %>';
					break;
				case eventsService.EVENTS.WIDGET_DELETED:
					msg = 'Removed widget #<%= id %>';
					break;
				case eventsService.EVENTS.WIDGET_TIMELINE_PRELOADED:
				case eventsService.EVENTS.WIDGET_PRELOADED:
					msg = 'Preloaded widget #<%= id %>';
					break;
				case eventsService.EVENTS.WIDGET_PUBLISHED:
					msg = 'Published widget #<%= id %>';
					break;
				case eventsService.EVENTS.BCAST_STARTED:
					msg = 'Broadcasting started';
					break;
				case eventsService.EVENTS.BCAST_STOPPED:
					msg = 'Broadcasting stopped';
					break;
				case eventsService.EVENTS.SETTING_CHANGED:
					if ( settingsKey ){
						if ( m = settingsKey.match( /^widget\/busy\/([0-9]+)/ ) ){
							if ( eventData.busy ){
								msg = 'Editing widget #' + m[1];
							}
							else{
								msg = 'Complete editing widget #' + m[1];
							}
						}
						else if ( m = settingsKey.match( new RegExp( '^' + bcastToken + 'collection/starred' ) ) ){
							msg = 'Change folder Starred';
						}
						else if ( m = settingsKey.match( new RegExp( '^' + bcastToken + 'timeline/unpublished' ) ) ){
							msg = 'Timeline activity';
						}
						else if ( m = settingsKey.match( new RegExp( '^' + bcastToken + 'storage' ) ) ){
							msg = 'Folders activity';
						}
						else if ( m = settingsKey.match( new RegExp( '^user/[0-9]+/session' ) ) ){
							msg = 'New user session';
						}
						else{
							msg = 'Settings changed ' + settingsKey;
						}
					}
					break;
				default:
					msg = 'Made action ' + eventName;
			}
			return _.template( msg, eventData );
		}


		return monitoringService;
	} ] );