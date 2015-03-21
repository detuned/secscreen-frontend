angular.module( 'riass.broadcasting' )
	.controller( 'FolderTypeLibCtrl', [ '$scope', 'folderService', 'folderTypeLibService', function ( $scope, folderService, folderTypeLibService ) {
		var isWidgetListReady = false;
		$scope.folderEngine = $scope.folder.registerEngine( folderTypeLibService.getEngine );
		$scope.widgets = $scope.folderEngine.getWidgets();
		$scope.tags = $scope.folderEngine.getTags();
		$scope.query = $scope.folderEngine.getQuery();
		$scope.searchState = $scope.folderEngine.searchState;


		$scope.loadMore = function (){
			$scope.folderEngine.loadMore();
		}

		$scope.onCapacityChange = function ( capacity ){
			$scope.folderEngine.setLimit( capacity );
			if ( ! isWidgetListReady && $scope.folderEngine.state.open ){
				$scope.folderEngine.refresh();
			}

			isWidgetListReady = true;
		}

		if ( $scope._folderCapacity ){
			$scope.onCapacityChange( $scope._folderCapacity );
		}

		;(function(){
			var
				currTags = [].concat( $scope.tags || [] ),
				currQuery = $scope.query.value;
			$scope.$watchCollection( 'tags', function ( v, prev ){
				if ( v.length != currTags.length ){
					$scope.folderEngine.refresh();
					$scope.$emit( 'storage:folderChangeState', $scope.folder );
					currTags = [].concat( v || [] );
				}
			} );

			$scope.$watch( 'query.value', function ( v, prev ){
				if ( currQuery != v ){
					$scope.folderEngine.refresh();
					$scope.$emit( 'storage:folderChangeState', $scope.folder );
					currQuery = v;
				}
			} );

		})();

	} ] );