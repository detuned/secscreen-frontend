angular.module( 'riass.broadcasting' )
	.controller( 'ImagePreviewCtrl', [ '$scope', '$rootScope', 'widgetService', 'workspaceService', function ( $scope, $rootScope, widgetService, workspaceService ) {
		$scope.createWidgetFromItem = function () {
			workspaceService.addWidgetByImage( $scope.image ).then(function (){
				if ( ! $scope.$$phase ){
					$scope.$apply();
				}
			})
		}
	}] );