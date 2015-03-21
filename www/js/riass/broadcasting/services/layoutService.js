angular.module( 'riass.broadcasting' )
	.service( 'layoutService', [ '$q', '$timeout', '$rootScope', '$document', 'CONST', 'settingsService', 'broadcastingService',
		function ( $q, $timeout, $rootScope, $document, CONST, settingsService, broadcastingService ) {
		var
			layoutService = {},
		/* Layouts hash keyed by id */
			layoutsRegistry = {},
			bcData = {},
		/* Panels hash keyed by id */
			panelsRegistry = {},
			allLayouts = [
				{
					title  : 'Senior editor',
					id     : 'director',
					panels : [
						{
							name                  : 'timeline',
							x                     : 0,
							y                     : 0,
							maxH                  : 165,
//						minH                  : 50,
							isFullScreenAvailable : false
						},
						{
							name : 'workspace',
							x    : 0,
							y    : 1,
							maxW : '43%'
						},
						{
							name : 'storage',
							x    : 1,
							y    : 1,
							maxW : '57%',
							isFullScreenAvailable : false
						},
						{
							name  : 'feed',
							x     : 0,
							y     : 2,
							maxH  : '165',
							isFullScreenAvailable : false
						}
					]
				},
				{
					title  : 'Assistant editor',
					id     : 'editor',
					panels : [
						{
							name                  : 'timeline',
							x                     : 0,
							y                     : 0,
							maxH                  : 100,
							isFullScreenAvailable : false
						},
						{
							name : 'workspace',
							x    : 0,
							y    : 1,
							maxW : '70%'
						},
						{
							name : 'storage',
							x    : 1,
							y    : 1,
							maxW : '30%',
							isFullScreenAvailable : false
						},
						{
							name : 'feed',
							x    : 0,
							y    : 2,
							maxH : '165',
							isFullScreenAvailable : false
						}
					]
				},
				{
					title  : 'Widget preparation',
					id     : 'prepare',
					panels : [
						{
							name                  : 'timeline',
							x                     : 0,
							y                     : 0,
							isFullScreenAvailable : false,
							maxH                  : 100,
							state                 : CONST.LAYOUT_PANEL_STATE_MIN
						},
						{
							name : 'workspace',
							x    : 0,
							y    : 1,
							maxW : '70%'
						},
						{
							name : 'storage',
							x    : 1,
							y    : 1,
							maxW : '30%',
							isFullScreenAvailable : false
						},
						{
							name  : 'feed',
							x     : 0,
							y     : 2,
							maxH  : '165',
							state : CONST.LAYOUT_PANEL_STATE_MIN,
							isFullScreenAvailable : false
						}
					]
				}
			]

		function Layout( data ) {
			var
				_defaultData = {
					name  : 'current',
					id    : 'current',
					title : 'My custom layout'
				},
				_data = angular.extend( {}, _defaultData ),
				panelsByName = {},
				panelsByRows = [],
				instance = {
					get name() { return _data.name },
					get title() { return _data.title },
					get id() { return _data.id },
					update             : function ( newData, options ) {
						var
							panelsData = {},
							panels = [],
							name = _data.name,
							_options = angular.extend( { save : false }, options || {} );
						this.reset();
						angular.extend( _data, newData );
						_data.name = name;
						if ( bcData && bcData.is_service ){
							fixLayoutAccordingToServiceBroadcasting( _data );
						}
						if ( _data.panels ) {
							panelsData = angular.extend( {}, _data.panels );
							delete _data.panels;
							angular.forEach( panelsData, function ( panelData ) {
								panels.push( Panel( panelData ) );
							} );
						}
						instance.addPanels( panels );
						if ( _options.save ) {
							triggerLayoutChange( instance, _options );
						}
						return this;
					},
					switchToCustomMode : function () {
						_data.name = _defaultData.name;
						_data.title = _defaultData.title;
					},
					addPanel           : function ( panel, isQuiet ) {
						if ( panel.name in panelsByName ) {
							throw new Error( 'Cannot add panel ' + panel.name + ' to layout ' + _data.name + ' cause it already exists there' );
						}
						panelsByName[ panel.name ] = panel;
						if ( !isQuiet ) {
							actualizePanels();
						}
						return this;
					},

					addPanels : function ( panels ) {
						angular.forEach( panels, function ( panel ) {
							instance.addPanel( panel, true );
						} );
						actualizePanels();
						return this;
					},

					reset : function () {
						_data = angular.extend( {}, _defaultData );
						panelsByName = {};
						panelsByRows = [];
					},

					toJson : function () {
						var json = {
							panels : []
						};

						angular.forEach( panelsByName, function ( panel ) {
							json.panels.push( panel.toJson() )
						} )

						return json;
					}
				};


			function actualizePanels( panelCausedUpdate ) {

				/* Updating distribution the panels by rows */
				panelsByRows = (function () {
					var res = [];
					angular.forEach( panelsByName, function ( panel ) {
						if ( !res[ panel.y ] ) {
							res[ panel.y ] = [];
						}
						res[ panel.y ][ panel.x ] = panel;
					} );
					return res;
				})();

				/* Actualizing panels types */
				angular.forEach( panelsByRows, function ( row ) {
					var
						panelsInRowWithMaxState = 0,
						panelToForceMaximization;
					angular.forEach( row, function ( panel ) {
						if ( panel ) {
							panel.type = row.length > 1
								? CONST.LAYOUT_PANEL_TYPE_VER
								: CONST.LAYOUT_PANEL_TYPE_HOR
							if ( panel.state == CONST.LAYOUT_PANEL_STATE_MAX ) {
								panelsInRowWithMaxState++;
							}
						}
					} );
					if ( row.length > 1 && !panelsInRowWithMaxState &&
						(panelToForceMaximization = _.find( row, function ( panel ) {
							return panel && panel.state != CONST.LAYOUT_PANEL_STATE_MAX && ( !panelCausedUpdate || panel.name != panelCausedUpdate.name );
						} ) )
						) {
						panelToForceMaximization.setStateQuietly( CONST.LAYOUT_PANEL_STATE_MAX );
					}

				} );

				function setPanelsSizes( panelsSet, coord ) {
					var
						dim = { x : 'width', y : 'height' }[ coord ],
						fnFromName = { x : 'countLeft', y : 'countTop' }[ coord ],
						fnDimName = { x : 'countWidth', y : 'countHeight' }[ coord ],
						totalAbs = 0,
						totalPercent = 0,
						unsizedNum = 0,
						unsizedWidth,
						totalSizeStr = '0',
						percentalPanels = [];

					angular.forEach( panelsSet, function ( panel ) {
						var size = panel[ dim ];
						if ( angular.isDefined( size ) ) {
							if ( isPercent( size ) ) {
								totalPercent += asNumber( size );
								percentalPanels.push( panel )
							}
							else {
								totalAbs += asNumber( size );
							}
						}
						else {
							unsizedNum++;
						}
					} );

					if ( unsizedNum ) {
						unsizedWidth = Math.max( 0, 100 - totalPercent ) / unsizedNum;
					}

					angular.forEach( panelsSet, function ( panel ) {
						var
							size = panel[ dim ],
							percentSizeFactor,
							sizeStr;
						if ( angular.isDefined( size ) ) {
							sizeStr = isPercent( size )
								? '( ( parentSize - ' + totalAbs + ') * ' + asNumber( size ) * ( !unsizedNum && totalPercent > 0 && totalPercent < 100 ? ( 100 / totalPercent ) : 1 ) + '/ 100 )'
								: size;
						}
						else {
							/* Unsized one */
							sizeStr = '( ( parentSize - ' + totalAbs + ') * ' + unsizedWidth + '/ 100 )';
						}
						panel[ fnFromName ] = new Function( 'parentSize', 'return ' + totalSizeStr );
						panel[ fnDimName ] = new Function( 'parentSize', 'return ' + sizeStr );
						totalSizeStr += ' + ' + sizeStr;
					} );

				}

				setPanelsSizes( _.map( panelsByRows, function ( row ) {
					return row[ row.length - 1 ];
				} ), 'y' );

				angular.forEach( panelsByRows, function ( row ) {
					var handledPanelInRow;
					if ( row.length > 1 ) {
						handledPanelInRow = row[ row.length - 1 ];
						angular.forEach( row.slice( 0, -1 ), function ( panel ) {
							/* Clone count functions to all panels at row from the last one (which was handled before)*/
							panel.countTop = handledPanelInRow.countTop;
							panel.countHeight = handledPanelInRow.countHeight;
						} );
						setPanelsSizes( row, 'x' );
					}
					else if ( row[0] ) {
						row[0].countLeft = new Function( 'return 0' );
						row[0].countWidth = new Function( 'parentSize', 'return parentSize' );
					}
				} );

				$rootScope.$emit( 'layoutUpdate' );

				// Need to duplicate trigger on document cause
				// $rootScope has no $off but sometimes it's required
				$document.trigger( 'layoutUpdate' )
			}

			function getPanelsByCoords( coords ) {
				return _.filter( panelsByName, function ( panel ) {
					return (
						!coords || (
							( !isNaN( coords.x ) && panel.x == coords.x ) &&
								( !isNaN( coords.y ) && panel.y == coords.y )
							) );
				} )
			}

			/* Applying init data */
			if ( angular.isString( data ) ) {
				/* If string given, we think it's name of panel  */
				return Layout( { name : data } );
			}
			else if ( angular.isObject( data ) ) {
				if ( data.name && ( data.name in layoutsRegistry ) ) {
					/* Layout instance with this name already exists. Update it and return.*/
					return layoutsRegistry[ data.name ].update( data );
				}
				angular.extend( _data, data );
			}

			$rootScope.$on( 'panelLayoutUpdate', function ( event, panel ) {
				if ( panel && panel.name && ( panel.name in panelsByName ) ) {
					actualizePanels( panel );
					instance.switchToCustomMode();
					triggerLayoutChange( instance );
				}
			} )

			$rootScope.$on( 'layoutPanelInit', function ( event ) {
				actualizePanels();
			} )

			layoutsRegistry[ _data.name ] = instance;

			return instance;
		}

		function Panel( data ) {
			var
				_defaultData = {
					x                     : 0,
					y                     : 0,
					minW                  : 30,
					minH                  : 23,
					maxW                  : undefined,
					maxH                  : undefined,
					type                  : CONST.LAYOUT_PANEL_TYPE_HOR,
					state                 : CONST.LAYOUT_PANEL_STATE_MAX,
					isFullScreen          : false,
					isFullScreenAvailable : true
				},
				_data = angular.extend( {}, _defaultData ),
				instance = {
					get name() { return _data.name },
					get x() { return _data.x },
					get y() { return _data.y },
					get isFullScreen() { return _data.isFullScreen },
					toggleFullScreen : function () {
						_data.isFullScreen = !_data.isFullScreen;
						$rootScope.$emit( 'panelToggleFullscreen', instance );
					},
					get isFullScreenAvailable() { return _data.isFullScreenAvailable },
					get state() { return _data.state },
					set state( v ) {
						_data.state = v;
						triggerChange();
					},
					setStateQuietly  : function ( v ) {
						_data.state = v;
					},
					get width() {
						return _data.type == CONST.LAYOUT_PANEL_TYPE_HOR
							? '100%'
							: _data.state == CONST.LAYOUT_PANEL_STATE_MIN
							? _data.minW
							: _data.maxW;
					},
					get height() {
						return _data.state == CONST.LAYOUT_PANEL_STATE_MIN && _data.type == CONST.LAYOUT_PANEL_TYPE_HOR
							? _data.minH
							: _data.maxH
					},
					get type() { return _data.type },
					set type( v ) {
						_data.type = v == CONST.LAYOUT_PANEL_TYPE_HOR
							? v
							: CONST.LAYOUT_PANEL_TYPE_VER
					},
					countTop         : function () { return 0 },
					countRight       : function () { return 0 },
					countBottom      : function () { return 0 },
					countLeft        : function () { return 0 },
					update           : function ( d ) {
						this.reset();
						angular.extend( _data, d );
						return this;
					},
					reset            : function () {
						_data = angular.extend( {}, _defaultData );
						return this;
					},
					getName          : function () {
						return _data.name;
					},
					toJson           : function () {
						var json = _.pick( _data, 'name', 'x', 'y', 'minW', 'maxW', 'minH', 'maxH', 'state', 'isFullScreen', 'isFullScreenAvailable' );

						return json;
					}
				};

			function triggerChange() {
				$rootScope.$emit( 'panelLayoutUpdate', instance );
			}

			if ( angular.isString( data ) ) {
				/* If string given, we think it's name of panel  */
				return Panel( { name : data } );
			}
			else if ( angular.isObject( data ) ) {
				if ( data.name && ( data.name in panelsRegistry ) ) {
					/* Panel instance with this name already exists. Update it and return.*/
					return _.keys( data ).length > 1
						? panelsRegistry[ data.name ].update( data )
						: panelsRegistry[ data.name ];
				}
				angular.extend( _data, data );
			}
			else {
				throw new Error( 'Cannot create Panel instance based on ' + data );
			}

			if ( !_data.name ) {
				throw new Error( 'Cannot create Panel instance without name' );
			}

			panelsRegistry[ _data.name ] = instance;
			return instance;
		}

		function isPercent( v ) {
			return angular.isDefined( v ) && v.toString().substr( -1 ) == '%';
		}

		function asNumber( v ) {
			return angular.isDefined( v )
				? Number( v.toString().replace( /%$/, '' ) )
				: 0
		}


		function triggerLayoutChange( layout, options ) {
			if ( layout.name == 'current' ) {
				layoutService.saveLayout( options );
			}
		}

		function fixLayoutAccordingToServiceBroadcasting( layout ){
			var
				timelinePanel;
			if (
				layout.panels &&
					( timelinePanel = _.find(
							layout.panels,
							function ( panel ){ return panel.name == 'timeline' }
						)
					)
				){
				timelinePanel.state = CONST.LAYOUT_PANEL_STATE_MIN;
			}
		}

		layoutService.getLayout = function () {
			var
				defer = $q.defer();

			broadcastingService.getActiveBroadcasting().then(function ( bc ){
				bcData = bc;
				loadLayout();
			}, loadLayout );

			function loadLayout(){
				settingsService.load( '//CUR_USER/layout' )
					.then( function ( layoutData ) {
						var
							layout = Layout(),
							preservedLayout;
						if (
							layoutData
								&& layoutData.id
								&& ( preservedLayout = _.find( allLayouts, function ( l ) { return l.id == layoutData.id } ) ) ) {

							layout.update( preservedLayout );
						}
						else if (
							! layoutData ||
							! angular.isObject( layoutData) ||
							angular.element.isEmptyObject( layoutData )
							){
							layout.update( allLayouts[0], { save : true } );
						}
						else {
							try {
								layout.update( layoutData );
							} catch ( e ) {
								console.log( 'Bad format of loaded data. Falling back to preserved layout' );
								layout.update( allLayouts[0], { save : true } );
							}
						}
						defer.resolve( layout );
					} );
			}
			return defer.promise;
		}

		layoutService.getAllLayouts = function () {
			return allLayouts;
		}

		layoutService.getPanel = function ( name ) {
			var panel = Panel( name );
			return panel;
		}

		layoutService.saveLayout = function ( options ) {
			var
				_options = angular.extend( {
					savePreset : false
				}, options || {} ),
				currentLayout = layoutsRegistry.current;
			if ( currentLayout ) {
				settingsService.save(
					'//CUR_USER/layout',
					_options.savePreset
						? { id : currentLayout.id }
						: currentLayout.toJson()
				)
			}
		}

		return layoutService;
	}] );