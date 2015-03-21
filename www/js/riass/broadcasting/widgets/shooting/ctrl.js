angular.module( 'riass.broadcasting' )
	.controller( 'WidgetShootingCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){

		$scope.representAsText = function (){
			var persons = [];
			if ( $scope.widgetText.fields.person[0].text ){
				persons.push( $scope.widgetText.fields.person[0].text );
			}
			if ( $scope.widgetText.fields.person[1].text ){
				persons.push( $scope.widgetText.fields.person[1].text );
			}
			return _.string.truncate( persons.join( ', ' ), 50, '...' );
		}
	} ] )
	.controller( 'WidgetShootingCtrlEdit', [ '$scope', 'utilsService', function ( $scope, utilsService ){
		
		for ( var i = 0; i < 3; i++ ) {
			if ( $scope.edit.widget.fields.person[i] && !$scope.edit.widget.fields.person[i].result ) {
				$scope.edit.widget.fields.person[i].result = [0, 0, 0 ,0, 0];
			}
		}
		
		$scope.edit.toggleResult = function ( n, i ) {
			var r = $scope.edit.widget.fields.person[n].result[i];
			$scope.edit.widget.fields.person[n].result[i] = r && r == 1 ? 0 : 1;
		}
		
		$scope.edit.normalizer(function ( editWidget ){
			utilsService
				.checkObject( editWidget, 'fields' )
					.checkArray( editWidget.fields, 'person' )
						.checkObject( editWidget.fields.person, 0 )
						.checkObject( editWidget.fields.person, 1 )
						.checkObject( editWidget.fields.person, 2 );
		})
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}
		
		
	} ] )