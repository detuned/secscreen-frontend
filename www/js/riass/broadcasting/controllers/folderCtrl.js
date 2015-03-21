angular.module( 'riass.broadcasting' )
	.controller( 'FolderCtrl', [ '$scope', '$attrs', '$element', '$compile', 'folderService', function ( $scope, $attrs, $element, $compile, folderService ){
		$scope.folder = folderService.getFolder({ id : $scope.$eval( $attrs.id ) });
		$scope.folder.whenReady().then(function (){
			var viewElement = $element.find( '.folder_body' );
			viewElement.html('<folder-type-display data-type="' + $scope.folder.type + '"></folder-type-display>');
			$compile( viewElement.contents() )($scope);
		} );
		$scope.remove = function ( event ){
			event.stopPropagation();
			$scope.$emit( 'storage:folderRemove', $scope.folder );
		}
		$scope.toggle = function (){
			if ( $scope.folder.state.fullscreen ){
				$scope.toggleFullscreen();
				return;
			}
			$scope.folder.toggle();
			$scope.$emit( 'storage:folderChangeState', $scope.folder );
		}
		$scope.toggleFullscreen = function ( event ){
		    $scope.folder.toggleFullscreen();
			if ( event ){
				event.stopPropagation();
			}
			$scope.$emit( 'storage:folderToggleFullscreen', $scope.folder);
		}
	} ] );