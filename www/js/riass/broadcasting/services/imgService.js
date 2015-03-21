angular.module( 'riass.broadcasting' )
	.service( 'imgService', [ '$rootScope', '$q', '$http', '$window', 'CONST', 'utilsService', 'dialogsService', function ( $rootScope, $q, $http, $window, CONST, utilsService, dialogsService ){
		var
			imgService = {};

		imgService.getImgUrl = function ( imgObject, size, options ){
			if ( ! imgObject ){
				return;
			}
			var url = options && options.addUrlField
				? imgObject[ options.addUrlField ] || imgObject.url
				: imgObject.url;
			return imgService.isCorrectImgObject( imgObject )
				? $rootScope.__getUrl(
				'//IMG/' +
					url.replace( /^\/+|\/+$/, '' ) +
					( size
						? '/resize/' + size
						: '' )
			)
				: undefined;
		}

		imgService.isCorrectImgObject = function ( imgObject ){
			return ! ! ( imgObject && imgObject.url );
		}

		imgService.getSimplifiedImgObject = function ( imgObject ){
			return imgObject.orig_url
				? _.pick( imgObject, 'orig_url', 'crop_y' )
				: { url : imgObject.url };
		}

		imgService.isImgNeedToBeCropped = function ( imgObject ){
			/*
			 * 'edited' flag switched on means image was cropped manually
			 * Since it means image has right proportion, simple crop is not required
			 */
			return imgObject && angular.isDefined( imgObject.crop_y ) && imgObject.id && ! imgObject.edited;
		}

		/**
		 * Makes SIMPLE crop based only on Y-offset
		 * Full real crop named ADVANCED see in imgService.advancedCropImg
		 * @param imgObject
		 * @returns {promise}
		 */
		imgService.cropImg = function ( imgObject ){
			var defer = $q.defer();

			if ( ! imgService.isImgNeedToBeCropped( imgObject ) ){
				defer.resolve();
			}
			else {
				$http.get(
					$rootScope.__getUrl( '//API/image/crop' ),
					{ params : {
						id     : imgObject.id,
						offset : imgObject.crop_y
					} }
				).then(
					function ( res ){
						var
							newImgObject = res.data.data,
							originalUrl = imgObject.url;
						if ( ! imgService.isCorrectImgObject( newImgObject ) ){
							defer.reject( 'Error cropping image id=' + imgObject.id + ' at server.' );
							return;
						}
						angular.extend( imgObject, newImgObject );
						imgObject.orig_url = originalUrl;
						defer.resolve( imgObject );
					},
					function ( error ){
						defer.reject( 'Error cropping image id=' + imgObject.id + ' at server.' );
					}
				)
			}
			return defer.promise;
		}

		function saveImage( imgObj, sourceType ){
			var defer = $q.defer();
			$http.post( $rootScope.__getUrl( '//API/image/create' ), {
				data : imgObj,
				type : sourceType
			} ).then(
				function ( res ){
					if ( imgService.isCorrectImgObject( res.data.data ) ){
						defer.resolve( res.data.data )
					}
					else {
						defer.reject();
					}
				},
				function (){
					defer.reject();
				} );
			return defer.promise;
		}

		imgService.chooseImg = function ( options ){
			var
				dialog,
				_options = angular.extend( {
					sources : [
						CONST.IMG_EXPORT_TYPE_BLITZ,
						CONST.IMG_EXPORT_TYPE_INTERNAL,
						CONST.IMG_EXPORT_TYPE_VR
					]
				}, options || {} ),
				defer;

			if ( ! _options.sources || ! _options.sources.length ){
				throw new Error( 'imgService.chooseImg: cannot choose img from no services' );
			}
			if ( _options.sources.length == 1 && _options.sources[0] == CONST.IMG_EXPORT_TYPE_VR ){
				/* Special way for only VR allowed.
				 In this case we're just directly show VR popup. */
				return imgService.chooseImgFromVr();
			}
			defer = $q.defer();

			/* Showing popup for image selection */
			dialog = dialogsService.open( {
				id          : 'images',
				templateUrl : $rootScope.__getUrl( '//APP/broadcasting/dialogs/images/imagesDialog.html' ),
				resize      : false,
				overlay     : 'dark',
				dialogData  : angular.extend(_.pick( _options, 'sources', 'defaultSource', 'defaultInternalTags', 'defaultTags' ), {
					chooseFromVr : function ( options ){
						imgService.chooseImgFromVr( options )
							.then( defer.resolve, defer.reject )
							.finally( function (){
								dialog.close();
							} );
					}
				} )
			} );

			dialog.whenDone().then(
				defer.resolve,
				function ( res ){
					if ( res.chooseImgFromVr ){
						imgService.chooseImgFromVr()
							.then( defer.resolve, defer.reject )
							.finally( function (){
								dialog.close();
							} )
					}
				}
			);

			return defer.promise;
		}

		imgService.editImg = function ( options ){
			var
				_options = angular.extend(
					{
						img : {}
					},
					options || {} ),
				defer = $q.defer(),
				dialog;

			if ( ( ! _options.img.orig_url && ! _options.img.url ) || ! _options.img.id ){
				defer.reject();
				throw new Error( 'imgService.editImg: bad image object, cannot edit' );
			}

			/* Showing popup for image selection */
			dialog = dialogsService.open( {
				id          : 'imgedit',
				templateUrl : $rootScope.__getUrl( '//APP/broadcasting/dialogs/imgedit/imgeditDialog.html' ),
				overlay     : 'dark',
				dialogData  : _.pick( _options, 'img' )
			} );

			dialog.whenDone().then(
				defer.resolve,
				defer.reject
			);

			return defer.promise;
		}

		imgService.advancedCropImg = function ( imgObject, options ){
			var
				_options = angular.extend( {
					x : 0,
					y : 0
				}, options || {} ),
				defer = $q.defer();

			if ( ! imgObject || ! imgObject.id ){
				defer.reject();
				throw new Error( 'imgService.advancedCropImg: bad image object with no id' );
			}
			if ( ! _options.w || ! _options.h ){
				defer.reject();
				throw new Error( 'imgService.advancedCropImg: cannot crop without width and/or height' );
			}

			$http.get(
				$rootScope.__getUrl( '//API/image/edit' ),
				{
					params : angular.extend(
						{ id : imgObject.id },
						_.pick( _options, 'x', 'y', 'w', 'h' )
					)
				}
			).then(
				function ( res ){
					var
						newImgObject = res.data.data;
					if ( ! imgService.isCorrectImgObject( newImgObject ) ){
						defer.reject( 'Error crop image id=' + imgObject.id + ' at server.' );
						return;
					}
//					if ( ! newImgObject.orig_url ){
//						newImgObject.orig_url = imgObject.url;
//					}
					if ( ! newImgObject.edited ){
						newImgObject.edited = true;
					}

					angular.extend( imgObject, newImgObject );
					if ( angular.isDefined( imgObject.crop_y ) ){
						delete imgObject.crop_y;
					}
					defer.resolve( imgObject );
				},
				function ( error ){
					defer.reject( 'Error crop image id=' + imgObject.id + ' at server.' );
				}
			)


			return defer.promise;
		}


		imgService.chooseImgFromVr = function ( options ){
			var
				_options = angular.extend({
					onSelect : function(){}
				}, options || {} ),
				defer = $q.defer(),
				popupWindow;
			$window.module = {};
			$window.module.SelectObject = function ( type, obj, tag, filterQuery ){
				_options.onSelect( obj );
				saveImage( obj, CONST.IMG_EXPORT_TYPE_VR )
					.then( defer.resolve, defer.reject );
				return true;
			}



			popupWindow = utilsService.openPopup( {
				url : CONST.IMG_CHOOSE_POPUP_URL
			} );


			//TODO check popup is closed (by heartbeat checking popupWindow.closed?)
			// and reject defer

			return defer.promise;
		}

		imgService.searchImages = function ( conditions ){
			var
				_conditions = angular.extend( {
					type    : undefined,
					ts      : undefined,
					q       : undefined,
					tags    : [],
					tagMode : undefined,
					offset  : 0,
					limit   : 20,
					sort    : undefined,
					cache   : undefined,
					id      : undefined
				}, conditions || {} ),
				queryParams = utilsService.uriQueryArray( _.pick( _conditions, 'tags' ) );

			return $http.get(
				$rootScope.__getUrl( '//API/image' ) + ( queryParams ? '?' + queryParams : ''),
				{ params : _.pick( _conditions, 'type', 'q', 'tagMode', 'ts', 'limit', 'offset', 'sort', 'id' ), cache : _conditions.cache}
			).then( function ( res ){
					var images = angular.isArray( res.data.data )
						? res.data.data
						: [];
					return images;
				} )
		}

		return imgService;
	} ] );