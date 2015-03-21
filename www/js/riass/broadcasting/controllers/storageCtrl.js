angular.module( 'riass.broadcasting' )
	.controller( 'StorageCtrl', [ '$scope', 'storageService', function ( $scope, storageService ) {

		$scope.createFolder = storageService.addNewUserFolder;

		$scope.collapseAllFolders = storageService.collapseAllFolders;

		$scope.hasFullscreenFolder = false;

		$scope.controlButtons = [
			{
				type   : 'create',
				text   : 'Create folder',
				action : $scope.createFolder,
				accent : true
			},
			{
				type   : 'collapse',
				text   : 'Minimize all',
				action : $scope.collapseAllFolders
			}
		];

		/* Handling closed container & button */
		;
		(function () {
			var
				toggleClosedButton = {
					type            : 'closed',
					text            : 'Deleted folders...',
					active          : false,
					clickableActive : true
				};
			$scope.isClosedOpen = false;
			$scope.toggleClosed = function () {
				toggleClosedButton.active = $scope.isClosedOpen = ! $scope.isClosedOpen;
			}
			$scope.closeClosed = function () {
				toggleClosedButton.active = $scope.isClosedOpen = false;
			}
			toggleClosedButton.action = $scope.toggleClosed;
			$scope.controlButtons.push( toggleClosedButton );
		})();

		//XXX What about separate actions for each button?
		$scope.controlButtonAction = function ( button ) {
			button.action && button.action();
		}

		$scope.userFolders = storageService.userFolders;
		$scope.systemFolders = storageService.systemFolders;
		$scope.closedFolders = storageService.closedFolders;

		$scope.restoreClosedFolder = function ( folderData ){
			storageService.restoreFolder( folderData );
			$scope.closeClosed();
		};

		$scope.saveUserFoldersOrder = function ( sortData ){
			storageService.changeUserFolderPosition( sortData.start, sortData.finish );
			if ( $scope.$$phase ){
				$scope.$apply();
			}
			storageService.saveFolders();
		}


		$scope.$on( 'storage:folderRemove', function ( event, folder ){
			storageService.removeFolder( folder );
			$scope.hasFullscreenFolder = false;
		} );

		$scope.$on( 'storage:folderChangeState', function ( event, folder ){
			storageService.saveFoldersState();
		} );

		$scope.$on( 'storage:folderToggleFullscreen', function ( event, folder ){
			$scope.hasFullscreenFolder = ! ! folder.state.fullscreen;
		} );

	}] );