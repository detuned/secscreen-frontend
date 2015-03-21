angular.module( 'riass.broadcasting' )
	.controller( 'WidgetCtrl', [ '$scope', '$rootScope', '$attrs', '$element', '$compile', 'CONST', 'widgetService', 'workspaceService',
		function ( $scope, $rootScope, $attrs, $element, $compile, CONST, widgetService, workspaceService ){
		$scope.widget = widgetService.getWidget( $scope.$eval( $attrs.id ) );

		$scope.widget.whenLoaded().then(function (){
			var viewElement = $element.find( '.widget_view' );
			viewElement.html('<widget-type-display data-type="' + $scope.widget.type + '" data-view="' + ( $attrs.viewType  || 'preview' ) + '"></widget-type-display>');
			$compile( viewElement.contents() )($scope);
			if ( $scope.onWidgetLoaded ){
				$scope.onWidgetLoaded( $scope.widget );
			}
		})

		$scope.editOriginal = function (){
			workspaceService.addWidget( { id : $scope.widget.id } );
		}
		$scope.editClone = function (){
			$scope.widget.clone().then(function ( clone ){
				workspaceService.addWidget( { id : clone.id } );
			});
		}
		$scope.isPublishingAllowed = function (){
			return ! $scope.widget.isPublished && $rootScope.broadcasting && $rootScope.broadcasting.status == CONST.BROADCASTING_STATUS_ON;
		}
		$scope.publish = function (){
			$rootScope.showWidgetPublishDialog( $scope.widget );
		}
		$scope.preventDblClick = function ( event ){
			event.stopPropagation();
			return false;
		}

	}]);