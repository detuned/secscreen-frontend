angular.module( 'riass.broadcasting' )
	.controller( 'WidgetPersonCtrl', [ '$scope', 'widgetService', function ( $scope, widgetService ){

		function representAsText( fields ){
			var text = '';
			if ( fields.name ){
				text = fields.name.replace( /\\n/g, ', ' );
			}
			else {
				text = fields.text || '';
			}
			return text;
		}

		$scope.representAsText = function (){
			return _.string.truncate( representAsText( $scope.widgetText.fields ), 50, '...' );
		}

		$scope.getShortTitle = function (){
			return representAsText( $scope.widget.fields );
		}

	} ] )
	.controller( 'WidgetPersonCtrlEdit', [ '$scope', 'utilsService', function ( $scope, utilsService ){
		$scope.edit.normalizer(function ( editWidget ){
			utilsService
				.checkObject( editWidget, 'fields' );
		})
		$scope.edit.validate = function (){
			//TODO real checking
			return true;
		}
	} ] )