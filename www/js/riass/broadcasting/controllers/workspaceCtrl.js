angular.module( 'riass.broadcasting' )
	.controller( 'WorkspaceCtrl', [ '$scope', '$rootScope', 'workspaceService',
		function ( $scope, $rootScope, workspaceService ) {

			$scope.wsWidgets = workspaceService.getWidgets();

			$scope.clear = function (){
				workspaceService.clear( { undo : true } );
			}
			$scope.controlButtons = [
				{
					type : 'create',
					text : 'Create widget',
					accent : true
				},
				{
					type : 'clear',
					text : 'Clear workspace'
				}
			];
			$scope.controlButtonAction = function ( button ){
				({
					clear : function (){
						workspaceService.clear( { undo : true } );
					},

					create : function (){
						workspaceService.addWidget( {}, { index : 0 });
					}

				})[ button.type ]();
			}
			$rootScope.$on( 'widgetDropped', function ( event, eventData ) {
				var
					widget = eventData.widget,
					zoneFrom = eventData.zoneFrom,
					zoneTo = eventData.zoneTo;
				if ( eventData.zoneTo == 'workspace' ) {
					workspaceService.addWidget({ id : widget.id });
				}
			} );

			$rootScope.$on( 'imageDropped', function ( event, eventData ) {
				var
					image = eventData.image,
					zoneFrom = eventData.zoneFrom,
					zoneTo = eventData.zoneTo;
				if ( eventData.zoneTo == 'workspace' ) {
					workspaceService.addWidgetByImage( image );
				}
			} );
		}] );