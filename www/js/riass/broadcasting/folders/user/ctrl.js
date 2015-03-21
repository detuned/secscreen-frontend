angular.module( 'riass.broadcasting' )
	.controller( 'FolderTypeUserCtrl', [ '$scope', '$rootScope', 'folderService', 'folderTypeUserService', function ( $scope, $rootScope, folderService, folderTypeUserService ){
		var isWidgetListReady = false;
		$scope.folderEngine = $scope.folder.registerEngine( folderTypeUserService.getEngine );

		$scope.folderEngine.whenReady().then( function (){
			$scope.widgets = $scope.folderEngine.getWidgets();
			$scope.tags = $scope.folderEngine.getTags();
			$scope.query = $scope.folderEngine.getQuery();
			$scope.searchState = $scope.folderEngine.searchState;

			$scope.loadMore = function (){
				$scope.folderEngine.loadMore();
			}

			$scope.isWidgetNew = $scope.folderEngine.isWidgetNew;

			$scope.onCapacityChange = function ( capacity ){
				$scope.folderEngine.setLimit( capacity );
				if ( ! isWidgetListReady ){
					$scope.folderEngine.whenReady().then( function (){
						if ( $scope.folderEngine.state.open ){
							$scope.folderEngine.refresh();
						}
					} );
					isWidgetListReady = true;
				}
			}

			if ( $scope._folderCapacity ){
				$scope.onCapacityChange( $scope._folderCapacity );
			}

			$rootScope.$on( 'widgetDropped', function ( event, eventData ) {
				var
					droppedWidget = eventData.widget,
					zoneFrom = eventData.zoneFrom,
					zoneTo = eventData.zoneTo;
				if ( eventData.zoneTo == 'userFolder' && eventData.zoneToData.id == $scope.folder.id ) {
					$scope.folderEngine.appendWidget( droppedWidget );
				}
			} );

			$scope.isWidgetDroppable = function ( eventData ){
				return eventData.widget && ! eventData.widget.isPublished && ! eventData.widget.isPreloaded;
			}

			;(function (){
				var
					currTags = [].concat( $scope.tags || [] ),
					currQuery = $scope.query.value;
				$scope.$watchCollection( 'tags', function ( v, prev ){
					if ( v.length != currTags.length ){
						$scope.folderEngine.refresh();
						$scope.folderEngine.save();
						//					$scope.$emit( 'storage:folderChangeState', $scope.folder );
						currTags = [].concat( v || [] );
					}
				} );

				$scope.$watch( 'query.value', function ( v, prev ){
					if ( currQuery != v ){
						$scope.folderEngine.refresh();
						$scope.folderEngine.save();
						currQuery = v;
					}
				} );
			})();
		} );

	} ] );