angular.module( 'riass.broadcasting' )
	.controller( 'WidgetQuestionCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title || $scope.widgetText.fields.text, 50, '...' );
		}
	} ] )
	.controller( 'WidgetQuestionCtrlEdit', [ '$scope', '$element', 'widgetService', function ( $scope, $element, widgetService ){
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}

	} ] )