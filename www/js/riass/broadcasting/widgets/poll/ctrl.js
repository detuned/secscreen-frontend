angular.module( 'riass.broadcasting' )
	.controller( 'WidgetPollCtrl', [ '$scope', '$element', 'widgetService', function ( $scope, $element, widgetService ){
		$scope.representAsText = function (){
			return _.string.truncate( $scope.widgetText.fields.title || $scope.widgetText.fields.text, 50, '...' );
		}
		$scope.showQuestions = function () {
			for ( var i = 0; i < 5; i ++ ) {
				if ( $scope.widget.fields.table && $scope.widget.fields.table[i] && $scope.widget.fields.table[i].column2_text ) {
					return false;
				}
			}
			return true;
		}
		var maxVotes = function () {
				var currentMax = 0;
				for ( var i = 0; i < 5; i ++ ) {
					if ( $scope.widget.fields.table && $scope.widget.fields.table[i] && $scope.widget.fields.table[i].column2_text ) {
						currentMax = Math.max( $scope.widget.fields.table[i].column2_text, currentMax );
					}
				}
				return currentMax;
			};

		$scope.getChartWidth = function ( votes ) {
			return  100 * ( votes / maxVotes() ) + '%';
		}
		
	} ] )
	.controller( 'WidgetPollCtrlEdit', [ '$scope', '$element', 'widgetService', 'utilsService', function ( $scope, $element, widgetService, utilsService ){
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