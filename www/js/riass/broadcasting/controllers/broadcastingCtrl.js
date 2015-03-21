/* Translation App */

angular.module('riass.broadcasting')
	.controller('BroadcastingCtrl', [ '$scope', '$rootScope', '$document', '$q', '$timeout', 'CONST', 'utilsService', 'eventsService', 'layoutService', 'timelineService', 'workspaceService', 'broadcastingService', 'storageService', 'widgetsCollectionService', 'tagsService', 'dialogsService', 'userSessionService', 'adminService',
		function ($scope, $rootScope, $document, $q, $timeout, CONST, utilsService, eventsService, layoutService, timelineService, workspaceService, broadcastingService, storageService, widgetsCollectionService, tagsService, dialogsService, userSessionService, adminService ) {

		/* Initialization */
		;(function () {
			var init = utilsService.PromisesCollector();

			$scope.isReady = false;
			init
				.add(
					broadcastingService.getBroadcasting( $rootScope.broadcastingId )
							.then(function (bc) {

							$rootScope.broadcasting = bc;
							if ( angular.isArray( bc.tags ) ){
								tagsService.setDefaultTags( bc.tags );
							}
						})
				)
				.add(
					layoutService.getLayout()
						.then(function ( layout ){
							$scope.layout = layout;
						})
				)
				.add(
					eventsService.init()
				)
				.add(
					timelineService.init()
				)
				.add(
					widgetsCollectionService.init()
				)
				.add(
					workspaceService.load()
				)
				.add(
					storageService.init()
				)
				.add(
					userSessionService.init()
				)
				/* All requests important for starting the app goes here */
				.run()
				.then(function (){
					initHotKeys();
//					App is ready now
					$scope.isReady = true;
				});
		})();

		$scope.changeBcStatus = function (status) {
			/* Timeout here is a hack to let dropdown close after button pushed */
			$timeout(function (){
				broadcastingService.setStatus($scope.broadcasting, status);
			}, 200 );
		}

		$scope.checkBroadcastingWarn = function (){
			var
				warningInterval = $rootScope.CONFIG && angular.isDefined( $rootScope.CONFIG.bcWarningInterval )
					? + $rootScope.CONFIG.bcWarningInterval
					: 60,
				absDiff = Math.abs( moment().diff(
					moment( $rootScope.broadcasting.start_at
					), 'seconds' ) );
			$rootScope.isBroadcastingStarting = ( warningInterval > 0  ) &&
				( $rootScope.broadcasting.status == CONST.BROADCASTING_STATUS_OFF ) &&
				( absDiff < warningInterval );
		}

		$scope.allLayouts = layoutService.getAllLayouts();

		$scope.showSportsDialog = function (){
			dialogsService.open({
				id : 'sports',
				templateUrl : $rootScope.__getUrl( '//APP/broadcasting/dialogs/sports/sportsDialog.html' )
			})
		}

		$rootScope.allowSportsSelect = $rootScope.CONFIG && $rootScope.CONFIG.allowSportsSelect;

		$rootScope.showWidgetPublishDialog = function ( widget ){
			dialogsService.open({
				id : 'publish',
				templateUrl : $rootScope.__getUrl( '//APP/broadcasting/dialogs/publish/publishDialog.html' ),
				dialogData : {
					widget : widget
				}
			})
		}


		$rootScope.isWidgetsVerbose = false;

		function initHotKeys(){
			$document.on( 'keyup', function ( event ){
				if ( document.activeElement != document.body ){
					return;
				}
				switch( event.which ){
					case 67:
						//c
						if ( ! dialogsService.activeDialog.id ){
							workspaceService.addWidget( {}, { index : 0 });
						}
						break;
					case 70:
						//f
						if ( ! dialogsService.activeDialog.id ){
							storageService.addNewUserFolder();
						}
						break;
				}
			} );
		}

	}])