angular.module( 'riass.broadcasting' )
	.controller( 'FolderTypeRecentCtrl', [ '$scope', 'folderTypeRecentService', function ( $scope, folderTypeRecentService ) {
		$scope.folderEngine = $scope.folder.registerEngine( folderTypeRecentService.getEngine );
		$scope.widgets = folderTypeRecentService.getWidgets();
	} ] );