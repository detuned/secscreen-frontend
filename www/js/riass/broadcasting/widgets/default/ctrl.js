angular.module( 'riass.broadcasting' )
	.controller( 'WidgetDefaultCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title || $scope.widgetText.fields.text, 50, '...' );
		}
	} ] )
	.controller( 'WidgetDefaultCtrlEdit', [ '$scope', '$element', 'widgetService', function ( $scope, $element, widgetService ){
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}

	} ] )