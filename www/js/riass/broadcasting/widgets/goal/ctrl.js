angular.module( 'riass.broadcasting' )
	.controller( 'WidgetGoalCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title, 50, '...' ) + ' ' + [
				$scope.widgetText.fields.score.num1,
				$scope.widgetText.fields.score.num2
			].join( ':' );
		}
	} ] )
	.controller( 'WidgetGoalCtrlEdit', [ '$scope', 'utilsService', function ( $scope, utilsService ){

		$scope.edit.normalizer(function ( editWidget ){
			utilsService
				.checkObject( editWidget, 'fields' )
					.checkObject( editWidget.fields, 'person' )
					.checkObject( editWidget.fields, 'score' );
		});

		$scope.edit.validate = function (){
			return true;
		}
	} ] )