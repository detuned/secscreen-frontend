angular.module( 'riass.broadcasting' )
	.controller( 'WidgetAboutCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title || $scope.widgetText.fields.text, 50, '...' );
		}
	} ] )
	.controller( 'WidgetAboutCtrlEdit', [ '$scope', '$element', 'widgetService', 'utilsService', function ( $scope, $element, widgetService, utilsService ){
		$scope.edit.normalizer(function ( editWidget ){
			utilsService
				.checkObject( editWidget, 'fields' )
					.checkArray( editWidget.fields, 'table' )
						.checkObject( editWidget.fields.table, 0 )
						.checkObject( editWidget.fields.table, 1 )
						.checkObject( editWidget.fields.table, 2 )
						.checkObject( editWidget.fields.table, 3 )
						.checkObject( editWidget.fields.table, 4 );
						
		})
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}
	} ] )