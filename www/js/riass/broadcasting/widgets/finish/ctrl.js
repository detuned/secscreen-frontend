angular.module( 'riass.broadcasting' )
	.controller( 'WidgetFinishCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title || $scope.widgetText.fields.text, 50, '...' );
		}
	} ] )
	.controller( 'WidgetFinishCtrlEdit', [ '$scope', '$element', 'widgetService', function ( $scope, $element, widgetService ){
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}

	} ] )