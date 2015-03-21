angular.module( 'riass.broadcasting' )
	.controller( 'ImagesDialogCtrl', [ '$scope', '$rootScope', '$element', '$compile', '$timeout', 'CONST', 'imgService', 'utilsService', function ( $scope, $rootScope, $element, $compile, $timeout, CONST, imgService, utilsService ) {
		var
			dialog = $scope.dialog,
			mapImgName2Type = {
				vr       : CONST.IMG_EXPORT_TYPE_VR,
				blitz    : CONST.IMG_EXPORT_TYPE_BLITZ,
				internal : CONST.IMG_EXPORT_TYPE_INTERNAL
			},
			mapImgType2Name = {},
			currentSearchConditions = {};
		mapImgType2Name[ CONST.IMG_EXPORT_TYPE_VR ] = 'vr';
		mapImgType2Name[ CONST.IMG_EXPORT_TYPE_BLITZ ] = 'blitz';
		mapImgType2Name[ CONST.IMG_EXPORT_TYPE_INTERNAL ] = 'internal';


		$scope.sources = {};

		/* Transforming sources array to hash to provide fast checking */
		if ( angular.isArray( dialog.data.sources ) ) {
			angular.forEach( dialog.data.sources, function ( source ) {
				if ( source in mapImgType2Name ) {
					$scope.sources[ mapImgType2Name[source] ] = true;
				}
			} );
		}

		if ( dialog.data.defaultSource ) {
			$scope.source = mapImgType2Name[ dialog.data.defaultSource ];
		}
		else {
			$scope.source = $scope.sources.internal
				? 'internal'
				: 'blitz';
		}


		/* Handling internal tags & filters */
		(function(){
			var
				internalFilters = $rootScope.CONFIG && $rootScope.CONFIG.bonusPackFilters
					? $rootScope.CONFIG.bonusPackFilters
					: [
						CONST.IMG_TAG_SPORTS,
						CONST.IMG_TAG_PERSON,
						[ CONST.IMG_TAG_FLAG, CONST.IMG_TAG__BIG ],
						CONST.IMG_TAG_ICONS
				    ],
				mapTagToFilterId = {};

			$scope.activeInternalFilterId = undefined;

			angular.forEach( internalFilters, function ( filter, filterId ){
				if ( angular.isString( filter ) ){
					filter = internalFilters[ filterId ] = {
						title : filter,
						tags : [ filter ]
					}
				}
				else if ( angular.isArray( filter ) ){
					filter = internalFilters[ filterId ] = {
						title : filter[0],
						tags : filter
					}
				}
				if ( filter.tags && filter.tags.length ){
					angular.forEach( filter.tags, function ( tag ){
					    mapTagToFilterId[ tag ] = filterId;
					});
				}
				if ( ! internalFilters[filterId].title && internalFilters[filterId].tags ){
					internalFilters[filterId].title = internalFilters[filterId].tags[0];
				}
			});

			$scope.internalFilters = internalFilters;
			$scope.internalUserTags = [];

			if ( angular.isArray( dialog.data.defaultInternalTags ) ) {
				angular.forEach( dialog.data.defaultInternalTags, function ( tag ) {
					if ( tag in mapTagToFilterId ){
						$scope.activeInternalFilterId = mapTagToFilterId[tag];
					}
					else{
						$scope.internalUserTags.push( tag );
					}
				} )
			}

			$scope.switchInternalFilter = function ( filterId ) {
				$scope.activeInternalFilterId = filterId == $scope.activeInternalFilterId
					? undefined
					: filterId;
				update();
			}

		})();

		$scope.tags = [];
		if ( angular.isArray( dialog.data.defaultTags ) ) {
			angular.forEach( dialog.data.defaultTags, function ( tag ) {
				$scope.tags.push( tag );
			} )
		}

		$scope.query = dialog.data.defaultQuery || '';
		$scope.internalQuery = dialog.data.defaultInternalQuery || '';

		/* Watching for blitz tags */
		(function () {
			var
				currTags = [].concat( $scope.tags || [] ),
				currQuery = $scope.query;
			$scope.$watchCollection( 'tags', function ( v, prev ) {
				if ( v.length != currTags.length ) {
					update();
					currTags = [].concat( v || [] );
				}
			} );
			$scope.$watch( 'query', function ( v, prev ){
				if ( currQuery != v ){
					update();
					currQuery = v;
				}
			} );
		})();

		/* Watching for internal tags */
		(function () {
			var
				currTags = [].concat( $scope.internalUserTags || [] ),
				currQuery = $scope.internalQuery;
			$scope.$watchCollection( 'internalUserTags', function ( v, prev ) {
				if ( v.length != currTags.length ) {
					if ( $scope.source == 'internal' ){
						update();
					}
					currTags = [].concat( v || [] );
				}
			} );
			$scope.$watch( 'internalQuery', function ( v, prev ){
				if ( currQuery != v ){
					update();
					currQuery = v;
				}
			} );
		})();

		$scope.setSource = function ( newSource ) {
			if ( newSource != $scope.source ) {
				$scope.source = newSource;
				$scope.isBlitzTagsInputFocused = ! ! ( $scope.source == 'blitz' );
				$scope.isInternalTagsInputFocused = ! ! ( $scope.source == 'internal' );
			}
			update()
		}

		$scope.isBlitzTagsInputFocused = false;
		$scope.isInternalTagsInputFocused = false;
		dialog.whenReady().then(function (){
			$timeout(function (){
				if ( $scope.source == 'blitz' ){
					$scope.isBlitzTagsInputFocused = true;
				}
				else if ( $scope.source == 'internal' ){
					$scope.isInternalTagsInputFocused = true;
				}
			},800);
		})

		$scope.results = [];
		$scope.isLoading = false;


		$scope.requestId = 0;

		function update( isMoreLoading ) {
			var searchConditions = {
				limit : 42
			};
			if ( isMoreLoading === true ){
				/* Continuing prev request */
				if ( currentSearchConditions.__complete ){
					/* Oh, all images already loaded for this request */
					return;
				}
				else{
					searchConditions = angular.extend( {}, currentSearchConditions );
					searchConditions.offset = $scope.results.length || 0;
				}
			}
			else{
				/* New request */
				if ( $scope.source == 'internal' ) {
					searchConditions.type = CONST.IMG_EXPORT_TYPE_INTERNAL;
					searchConditions.tags = [];
					if ( angular.isDefined( $scope.activeInternalFilterId ) &&
					     $scope.internalFilters[ $scope.activeInternalFilterId ] &&
					     $scope.internalFilters[ $scope.activeInternalFilterId ].tags
						){
						searchConditions.tags = [].concat( $scope.internalFilters[ $scope.activeInternalFilterId ].tags  );
					}
					searchConditions.tags = searchConditions.tags.concat( $scope.internalUserTags );
					if ( $scope.internalQuery ){
						searchConditions.q = $scope.internalQuery;
					}
					searchConditions.cache = true;
				}
				else if ( $scope.source == 'blitz' ) {
					searchConditions.type = CONST.IMG_EXPORT_TYPE_BLITZ;
					searchConditions.tags = $scope.tags;
					searchConditions.sort = CONST.IMG_SORT_TIME_DESC;
					if ( $scope.query ){
						searchConditions.q = $scope.query;
					}
				}


				currentSearchConditions = angular.extend( {}, searchConditions );
				$scope.requestId ++;
				if ( $scope.requestId > 1000 ){
					$scope.requestId = 0;
				}
			}

			$scope.isLoading = true;
			imgService.searchImages( searchConditions )
				.then( function ( images ) {
					if ( ! isMoreLoading ){
						$scope.results.length = 0;
					}
					if ( images.length < searchConditions.limit ){
						currentSearchConditions.__complete = true;
					}
					angular.forEach( images, function ( image ) {
						$scope.results.push( image );
					} )
				} )
				.finally( function () {
					$scope.isLoading = false;
				} )
		}

		$scope.loadMore = function (){
			if ( ! $scope.isLoading ){
				update( true );
			}
		}

		$scope.selectImage = function ( img ) {
			dialog.done( img );
		}

		dialog.ready();
		update();

	} ] );