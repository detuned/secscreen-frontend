angular.module( 'riass.broadcasting' )
	.controller( 'FolderTypeStarredCtrl', [ '$scope', '$rootScope', 'folderTypeStarredService', function ( $scope, $rootScope, folderTypeStarredService ) {
		$scope.folderEngine = $scope.folder.registerEngine( folderTypeStarredService.getEngine );
		$scope.widgets = folderTypeStarredService.getWidgets();
		$scope.isWidgetDroppable = function ( data ){
			return ! data.widget.isStarred;
		}
		$rootScope.$on( 'widgetDropped', function ( event, eventData ) {
			var
				widget = eventData.widget;
			if ( eventData.zoneTo == 'starredFolder' ) {
				folderTypeStarredService.addWidget({ id : widget.id });
			}
		} )

	} ] );