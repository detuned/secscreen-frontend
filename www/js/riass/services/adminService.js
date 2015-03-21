angular.module( 'riass' )
	.service( 'adminService', [ '$rootScope', '$window', 'CONST', 'utilsService', 'eventsService', 'layoutService', 'timelineService', 'workspaceService', 'broadcastingService', 'storageService', 'widgetsCollectionService', 'tagsService', 'dialogsService', 'settingsService', 'userSessionService', 'monitoringService', 'widgetService', 'notifyService', 'imgService',
		function ( $rootScope, $window, CONST, utilsService, eventsService, layoutService, timelineService, workspaceService, broadcastingService, storageService, widgetsCollectionService, tagsService, dialogsService, settingsService, userSessionService, monitoringService, widgetService, notifyService, imgService ){
			var
				isAdmin = $rootScope.user && ( + $rootScope.user.role == CONST.USER_ROLE_ADMIN ),
				monitoringDialog,
				adminService = {
					sendUserOrder : function(){ return false; },
					userRemoteControl : function(){ return false; }
				},
				adminConsole = {
					sudo : sudo
				};

			function sudo( sessionId ){
				if ( ! sessionId ){
					return 'sessionId required';
				}
				if ( ! userSessionService.sessionId ){
					return 'Cannot run sudo: no sessions found';
				}
				if ( sessionId != userSessionService.sessionId ){
					return 'Wrong session id';
				}
				extendAdminConsole();
				return 'sudo started';
			}

			function extendAdminConsole(){
				angular.extend( adminConsole, {
					'$rootScope'               : $rootScope,
					'CONST'                    : CONST,

					// Services
					'utilsService'             : utilsService,
					'eventsService'            : eventsService,
					'layoutService'            : layoutService,
					'timelineService'          : timelineService,
					'workspaceService'         : workspaceService,
					'broadcastingService'      : broadcastingService,
					'storageService'           : storageService,
					'widgetsCollectionService' : widgetsCollectionService,
					'tagsService'              : tagsService,
					'dialogsService'           : dialogsService,
					'userSessionService'       : userSessionService,
					'settingsService'          : settingsService,
					'widgetService'            : widgetService,
					'notifyService'            : notifyService,
					'imgService'               : imgService,
					'$window'                  : $window,

					// Usable utilities
					'getWorkspaceData'      : function (){
						return workspaceService.getWidgets();
					},
					'getWorkspaceWidgets'      : function (){
						return _.pluck( workspaceService.getWidgets() || [], 'id' );
					},
					'getTimelineWidgets'       : function (){
						return _.pluck( timelineService.widgetsNotPublished || [], 'id' );
					},
					'removeWidgetFromTimeline' : function ( id ){
						if ( ! id ){
							return 'Widget id required';
						}
						$rootScope.$emit( 'removeWidgetFromTimeline', { widget : { id : id } } );
					},
					'getSettings' : function ( key ){
						if ( ! key ){
							return 'Settings key required';
						}
						settingsService.load( key ).then(function ( res ){
							console.log( 'settings loaded for key ', key, '. Result is ', res );
						})
					},
					'getWidget' : function ( id ){
						if ( ! id ){
							return 'Widget id required';
						}
						var widget = widgetService.getWidget( id );
						if ( ! widget ){
							return 'Cannot create widget object for id' + id;
						}
						widget.whenLoaded().then(function (){
							console.log( 'widget id ', id, ' just loaded. Result is ', _.pick( widget,
								'type',
								'fields',
								'tags',
								'isPublished',
								'isPreloaded',
								'pubStatus',
								'pubCount',
								'parentId',
								'isLoading',
								'isError',
								'isStarred',
								'isHighlighted',
								'isBusy',
								'editors',
								'attach',
								'state'
							));
						});
						return 'Loading widget id ' + id + '...';
					},

					'showWidgetsIds' : function (){
						$rootScope.isWidgetsVerbose = true;
					},
					'hideWidgetsIds' : function (){
						$rootScope.isWidgetsVerbose = false;
					},
					'toggleWidgetsIds' : function (){
						$rootScope.isWidgetsVerbose = ! $rootScope.isWidgetsVerbose;
					},
					'askReload' : askReload
				} );

				if ( isAdmin ){
					angular.extend( adminConsole, {
						'monitor'       : function (){
							openMonitoringDialog();
							return 'Opening monitoring dialog...'
						},
						'startMonitoring' : function (){
							if ( monitoringService.run() ){
								return 'Starting monitoring users events';
							}
							else{
								return 'Monitoring already started';
							}

						}
					} );
				}

			}

			function openMonitoringDialog(){
				monitoringDialog = dialogsService.open( {
					id          : 'monitoring',
					templateUrl : $rootScope.__getUrl( '//APP/dialogs/monitoring/monitoringDialog.html' ),
					resize      : false,
					overlay     : 'transparent',
					dialogData  : {}
				} );
			}

			function askReload( options ){
				notifyService.applyMessage(angular.extend({
						text : 'Refresh the window as soon as possible',
						ttl : 0,
						type : 'ask',
						actions : [
							{
								text : 'Refresh now'
							}
						]
					}, options || {} ))
					.whenAction().then(function (){
						if ( $window.location && $window.location.reload ){
							$window.location.reload();
						}
					})
			}


			if ( isAdmin ){
				extendAdminConsole();
			}


			// Dispatching actions sending via settings
			(function(){
				if ( ! $rootScope.CONFIG || ! $rootScope.CONFIG.allowRemoteControl ){
					return;
				}

				function onOrderReceive( event, eventData ){
					if ( eventData && eventData.action ){
						$rootScope.$emit( 'userOrderReceive', eventData );
						$rootScope.$emit( 'userOrderReceive:' + eventData.action, eventData );
					}
				}

				eventsService.on( eventsService.EVENTS.SETTING_CHANGED, onOrderReceive,
					{ key : '//CUR_USER_BC/order' }
				);

				eventsService.on( eventsService.EVENTS.SETTING_CHANGED, onOrderReceive,
					{ key : 'user/all/bcast/' + $rootScope.broadcastingId + '/order' }
				);

				if ( isAdmin ){
					adminService.sendUserOrder = function ( userId, actionName, actionData ){
						return settingsService.save(
							'/user/' + userId + '/bcast/' + $rootScope.broadcastingId + '/order',
							angular.extend( { action : actionName }, actionData || {} ),
							{ public : true }
						);
					}
					adminConsole.sendUserOrder = adminService.sendUserOrder;

					adminService.userRemoteControl = function ( userId ){
						adminService.sendUserOrder( userId, 'jsconsole' );
						userSessionService.loadUserSessionId( userId ).then(function ( userSession ){
							if ( userSession && userSession.id ){
								$window.open( userSessionService.getJsConsoleUrl( userSession.id ) );
							}
						})
					}

					adminConsole.userRemoteControl = adminService.userRemoteControl;
				}

				$rootScope.$on( 'userOrderReceive:askReload', function ( event, eventData ){
					askReload( eventData || {} );
				})

			})();


			$window.riassAdmin = adminConsole;

			return adminService;
		}] );