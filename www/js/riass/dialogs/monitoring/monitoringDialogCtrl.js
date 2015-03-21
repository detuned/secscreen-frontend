angular.module( 'riass.broadcasting' )
	.controller( 'MonitoringDialogCtrl', [ '$scope', '$rootScope', '$window', 'CONST', 'eventsService', 'monitoringService', 'userSessionService', 'adminService',
		function ( $scope, $rootScope, $window, CONST, eventsService, monitoringService, userSessionService, adminService ){
		var
			dialog = $scope.dialog;

		$scope.activities = monitoringService.activities;
		$scope.isFullView = true;
		$scope.isRemoteControlAllowed = $rootScope.CONFIG && $rootScope.CONFIG.allowRemoteControl;

		$scope.getActivitiesNum = function (){
			return monitoringService.activitiesNum;
		}

		$scope.userRemoteControl = function ( user ){
			return adminService.userRemoteControl( user.id );
		};

		$scope.dumpActivity = function ( activity ){
			console.dir( _.pick( activity, 'data', 'date', 'msg', 'name', 'repeat' ) );
		}

		$scope.cancel = function (){
			dialog.close();
		}

		monitoringService.run();
		dialog.ready();

	} ] );