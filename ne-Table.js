/*
后台返回结果集时，除了要返回所有记录
还要返回两个参数
1. totalLength（数据库中的总条数）
2. qrLength（当前页应该显示的记录数）
*/

/* 可以改进的地方：
1. 可以增加缓存变量，减少请求,不用每次都去服务器取数据
2. 组件化
3. 修改的时候判断是否改变过，没改变过就不提交这部分
4. 页面只允许存在一个neTable
*/

/*
有个bug，后面记得改，就是tablePages不能改变
*/

(function (global, $) {
	var neTable_modals = {}, // 存储所有模态框的对象
		MODAL_ID = 1, // modal的id从1开始
		ajaxTableXHR; // 每次进行表格初始化后的XHR

	(function () {
		"use strict";
		$.neTable = $.neTable || {};
		// neTable对象添加静态方法
		$.extend($.neTable, {
			version : "0.1",
			ops : null,
			TIPS : {
				MODAL_DELETE_TIP : '确定要删除这一行吗？'
			},
			getMethod : function (functionName) { // 返回$.fn.neTable中指定的方法
				return ($.fn.neTable)[functionName];
			},
			extendJQ_fn_neTable : function(methods) { // 给$.fn.neTable对象添加静态方法
				$.extend($.fn.neTable, methods);
			},
			modalHighlight : function (element) { // 模态框的输入框不合法时高亮
				if($(element).nextAll("span").length) {
					$(element).nextAll("span").removeClass("icon-ok").addClass("icon-error");
				} else {
					$(element).after($("<span class='icon iconfont icon-error form-control-feedback'></span>"));
				}
			},
			modalUnhighlight : function (element) { // 模态框的输入框合法时高亮
				if($(element).nextAll("span").length) {
					$(element).nextAll("span").removeClass("icon-error").addClass("icon-ok");
				} else {
					$(element).after($("<span class='icon iconfont icon-ok form-control-feedback'></span>"));
				}
			},
		});	

		// 创建表格(即对外创建表格的接口 )
		// 在JQ原型中添加neTable方法。任何JQ实例都能调用这个方法。options : 初始调用时传入的关于表格的参数
		$.fn.neTable = function(options) {
			// 请求的是一个方法
			if (typeof options === 'string') {
				var method = $.neTable.getMethod(options);
				if (!method) {
					throw ("neTable has no such method: " + options);
				}

				var args = $.makeArray(arguments).slice(1); // 将参数列表转换为数组，并除去options这个参数
				return method.apply(this, args);
			}

			var defaultOps = {
					url: "", // // 获取表格数据的地址 
					height: 250, // 表格高度
					curPage: 1, // 设置当前的页码
					rowNum: 10, // 一页显示的条数
					colModel: [], // 常用到的属性(以后再慢慢实现)
								  // name 在前台列显示的名称，即返回的JSON对象中的各个参数的名字
								  // index 传到服务器端用来排序用的列名称,即在数据库中的字段名
								  // width 列宽度
								  // height 列高度
								  // align 对齐方式
								  // type 类型，类型不同，在表格中的显示不同
					colNames: [], // 列显示名称，是一个数组对象
					sortorder: "asc", // 排序顺序，升序或者降序（asc  or desc）
					sortname: "id", // 默认的排序列名称,这个参数会被提交到后台	 
					datatype: "json", // 从服务器端返回的数据类型
					type: "get", // ajax提交方式
					queryCondition: {}, // 进行查询时的查询条件
					operatePerm: { // 进行增删改查的权限（0代表禁止，1代表允许）
						addedPerm: 1,
						deletedPerm: 1,
						modifiedPerm: 1,
						queriedPerm: 1
					},
					tablePages: 10 // 表格一次显示的页数 (即在表格中只有xx个页码可以选择  )
				},
				ops = $.neTable.ops = $.extend(true, defaultOps, options || {}),
				tbody_tr_operationTd = $('<td class="neTable-tb-td"><a class="neTableTd-modify" onclick="return false;"><i class="icon iconfont icon-modify"></i><span>修改</span></a>' + // 操作列 (表格的最后一列 )
		                				'<a class="neTableTd-delete" onclick="return false;"><i class="icon iconfont icon-delete"></i><span>删除</span></a></td>'),
				self = options.clearWrap ? this.empty() : this,
				pages, // 总页数（按照一行rownum条数据在数据库中总共的页数）
				wrap_neTable = $.neTable.ops.wrap_neTable = this,// 将表格放在哪个标签中，这是由用户指定的
				neTable_warp, // 表格的最父级,在第一次请求成功后赋值
				createNE_Table = function(returnedJsonObj) {
					neTable_warp = $('<div class="neTable-warp" id="neTable-warp">'); // neTable_warp
					var neTable_table_warp = $('<div class="neTable-table-warp"></div>'), // neTable_table_warp
						table = $('<table class="neTable-table"></table>'), // table
						tableOps = ops,
						i, j; // 循环变量

					// thead
					var thead = $('<thead></thead>'),
						thead_tr = $('<tr class="neTable-th-tr"></tr>'), // thead里面的tr
						thead_tr_th, // 构造thead里面的tr里面的th
						thead_tr_operation = $('<th class="neTable-th-th">操作</th>'),
						thead_tr_th_length = tableOps.colNames.length; // 一行有多少列
					for(i = 0; i < thead_tr_th_length; i++) {
						thead_tr_th = $('<th class="neTable-th-th">' + tableOps.colNames[i] + '</th>');
						thead_tr.append(thead_tr_th);
					}
					thead_tr.append(thead_tr_operation); // 最后一栏是操作栏，单独插入
					thead.append(thead_tr);

					// tbody
					var tbody = $('<tbody></tbody>'),
						tbody_tr, // tbody里面的tr
						tbody_tr_td, // 构造tbody里面的tr里面的td
						tbody_tr_length = returnedJsonObj.qrLength, // 有多少行
						queryResult = returnedJsonObj.queryResult;
					for(i = 0; i < tbody_tr_length; i++) {
						tbody_tr = $('<tr class="neTable-tb-tr"></tr>').attr('neTable-tr-id', queryResult[i][tableOps.colModel[0].index]);

						for(j = 0; j < tableOps.colNames.length; j++) {
							tbody_tr_td = $('<td class="neTable-tb-td" neTable-td-name=' + tableOps.colModel[j].index + '>' + queryResult[i][tableOps.colModel[j].index] + '</td>');
							tbody_tr.append(tbody_tr_td);
						}				
						tbody_tr.append(tbody_tr_operationTd.clone(true, true)); // 表格的最后一列是操作，这一列和其他列插入的内容不同，单独插入

						tbody.append(tbody_tr);
					}

					table.append(thead);
					table.append(tbody);
					neTable_table_warp.append(table);
					neTable_warp.append(neTable_table_warp); // 到这里表格创建完成

					wrap_neTable.append(neTable_warp); // 将表格添加到用户指定的地方
					return $(wrap_neTable);
				},
				createNE_TablePager = function(returnedJsonObj) {
					var tableOps = ops,
						curPage = tableOps.curPage;

					// 以下为构造表格分页栏部分		
					var neTable_Pager = $('<div class="neTable-Pager clearfix"></div>'),
						pagination = $('<ul class="pagination"></ul>'),
						pagination_liTag, // pagination下的li标签(只包含页码，不包含上一页这些  )
						firstPageTag = $('<li><a class="first" data-value="1">首页</a></li>'),
						prevPageTag  = $('<li><a class="prev" data-value="' + (curPage - 1) + '"' + '>上一页</a></li>'),
						nextPageTag  = $('<li><a class="next" data-value="' + (curPage + 1) + '"' + '>下一页</a></li>'),
						lastPageTag  = $('<li><a class="last" data-value="' + pages + '"' + '>尾页</a></li>'),
						pageNumInfo  = $('<div class="pageNumInfo">共有' + returnedJsonObj.totalLength + '条记录</div>'),
						i; // 循环变量

					// 当前在第一页，则上一页和首页按钮不能点击
					if(curPage == 1) {
						prevPageTag.addClass('disabled').children('a').attr('onclick', 'return false');
						firstPageTag.addClass('disabled').children('a').attr('onclick', 'return false');
					}
					// 当前在最后一页，则下一页和尾页按钮不能点击
					if(curPage == pages) {
						nextPageTag.addClass('disabled').children('a').attr('onclick', 'return false');
						lastPageTag.addClass('disabled').children('a').attr('onclick', 'return false');
					}
					pagination.append(firstPageTag);
					pagination.append(prevPageTag);
					for(i = 0; i < tableOps.tablePages; i++) {
						pagination_liTag = $('<li><a data-value="' + (i + 1) + '">' + (i + 1) + '</a></li>');
						pagination.append(pagination_liTag);
						if((i + 1) === curPage) { // 当前页的页码禁止点击
							pagination_liTag.addClass('disabled').children('a').addClass('curPage').attr('onclick', 'return false;');
						}
					}
					pagination.append(nextPageTag);
					pagination.append(lastPageTag);

					neTable_Pager.append(pagination);
					neTable_Pager.append(pageNumInfo);			
					neTable_warp.append(neTable_Pager);
				},
				updateNE_Table = function(returnedJsonObj) { // 更新表格（点击页码后调用）
					var tbody = neTable_warp.find('table tbody'),
						tbody_tr, // 如果需要新创建一行时使用
						tbody_tr_td, // 如果需要新创建一列时使用
						trs = tbody.find('tr'),
						queryResult = returnedJsonObj.queryResult,
						qrLength = returnedJsonObj.qrLength,
						tableOps = ops,						
						tr,
						td,
						i, j;

					// 以下处理两种情况 1.现在有10条记录，点击后只有5条。2  .现在有5条记录，点击后有10条
					for(i = 0; i < qrLength; i++) {
						if(i >= trs.length && qrLength > trs.length) {
							break ;
						}

						tr = $(trs[i]); // 找到原来的tr
						tr.attr('neTable-tr-id', queryResult[i][tableOps.colModel[0].index]); // 更新tr的id属性
						for(j = 0; j < tableOps.colNames.length; j++) {
							td = $(tr.find('td')[j]); // 找到原来的td
							td.html(queryResult[i][tableOps.colModel[j].index]); // 更新单元格
						}
					}
					if(qrLength > trs.length) {
						for(; i < qrLength; i++) {
							tbody_tr = $('<tr class="neTable-tb-tr"></tr>').attr('neTable-tr-id', queryResult[i][tableOps.colModel[0].index]);
							for(j = 0; j < tableOps.colNames.length; j++) {
								tbody_tr_td = $('<td class="neTable-tb-td" neTable-td-name=' + tableOps.colModel[j].index + '>' + queryResult[i][tableOps.colModel[j].index] + '</td>');
								tbody_tr.append(tbody_tr_td);
							}
							tbody_tr.append(tbody_tr_operationTd.clone(true, true));

							tbody.append(tbody_tr);
						}
					} else {			
						for(; i < trs.length; i++) {
							$(trs[i]).detach();
						}
					}
				},
				updateNE_TablePager = function(returnedJsonObj) { // 更新分页栏（点击页码后调用）
					var pager_ul_li = neTable_warp.find('.neTable-Pager ul li'),
						oldPage = returnedJsonObj.oldPage,
						tableOps = ops,
						curPage = tableOps.curPage,				
						firstATag = pager_ul_li.find('a.first'),
						prevATag = pager_ul_li.find('a.prev'),
						nextATag = pager_ul_li.find('a.next'),
						lastATag = pager_ul_li.find('a.last'),
						i, j, k, m,
						curPage_posIndex = 5, // 当前页总是位于第5个位置 (页数超过tablePages的情况下 )
						getCurPageShowedPages = function() { // 获取当前页应该显示多少个页码
							if(pages < tableOps.tablePages) {
								return pages;
							} else {
								var res = tableOps.tablePages - (curPage + curPage_posIndex - pages); 			
								return res > tableOps.tablePages ? tableOps.tablePages : res;
							}
						};

					// 去掉点击之前的页码具有的属性，如现在是第一页，点击第二页，则来有curPage这个class
					// 的为data-value为1的标签，现在当前页变为2，那么这个标签的class应该去掉
					prevATag.removeAttr('onclick').parent().removeClass('disabled');
					nextATag.removeAttr('onclick').parent().removeClass('disabled');
					pager_ul_li.find('a[data-value="' + oldPage + '"]').removeAttr('onclick').
						parent().removeClass('disabled').
						children('a').not(function() {
						  return $(this).hasClass('first') || $(this).hasClass('last');
						}).removeClass('curPage');

					// 更新标签的data -value值
					prevATag.attr('data-value', curPage - 1);
					nextATag.attr('data-value', curPage + 1);
					// 当前在第一页，则上一页和首页按钮不能点击
					if(curPage == 1) {
						prevATag.attr('onclick', 'return false').parent().addClass('disabled');
						firstATag.attr('onclick', 'return false').parent().addClass('disabled');
					}
					// 当前在最后一页，则下一页和尾页按钮不能点击
					if(curPage == pages) {
						nextATag.attr('onclick', 'return false').parent().addClass('disabled');
						lastATag.attr('onclick', 'return false').parent().addClass('disabled');
					}

					// 调整页码的位置
					var pager_ul_pageLi = pager_ul_li.not(function(index) { // 挑选出页码 (即排除首页，上一页，下一页，尾页  )
							return index <= 1 || index >= pager_ul_li.length - 2;
						});
					if(pages > tableOps.tablePages) { // 总页数大于分页栏展示的页数
						var curPageShowedPages = getCurPageShowedPages(),
							lastLi_dataValue = pager_ul_pageLi.last().children('a').attr('data-value');

						if(curPage > curPage_posIndex || lastLi_dataValue > tableOps.tablePages) { // 在这里是点击的至少是第6页才调整位置
							for(i = 0, j = curPage_posIndex - 1, k = 0, m = 1; i < curPageShowedPages; i++) {
								if(j > 0 && m != curPage) { // 更新当前页之前的页码 (这个是肯定存在的 )
									if(curPage - curPage_posIndex < 0) {
										$(pager_ul_pageLi[i]).children('a').attr('data-value', m).html(m);
										m++;
									} else {
										$(pager_ul_pageLi[i]).children('a').attr('data-value', curPage - j).html(curPage - j);
									}
									j--;
								} else { // 更新当前页之后的页码
									// 页码原来不存在
									if(!pager_ul_pageLi[i]) {
										pager_ul_pageLi[i] = $('<li><a data-value="' + (curPage + k) + '">' + (curPage + k) + '</a></li>');
										k++;

										var pager_ul_li_temp = pager_ul_pageLi.last().after(pager_ul_pageLi[i]);
										// 更新，否则pager_ul_li和pager_ul_pageLi还是指向未after之前的对象
										pager_ul_li = pager_ul_li_temp.parent().children('li');
										pager_ul_pageLi = pager_ul_li.not(function(index) {
											return index <= 1 || index >= pager_ul_li.length - 2;
										});
									} else {
										$(pager_ul_pageLi[i]).children('a').attr('data-value', curPage + k).html(curPage + k);
										k++;
									}
								}
							}

							// 原来显示了10个页码，现在应该显示8个，所以将后面的删除
							for(; i < tableOps.tablePages; i++) {
								if(pager_ul_pageLi[i]) {
									$(pager_ul_pageLi[i]).remove();
								}
							}
						}
					}

					// 更新data -value值为当前页的标签，并禁止点击
					pager_ul_li.find('a[data-value="' + curPage + '"]').attr('onclick', 'return false').
						parent().addClass('disabled').
						children('a').not(function() {
						  return $(this).hasClass('first') || $(this).hasClass('last');
						}).addClass('curPage');
				},
				bindTableModifyEvent = (function() { // 绑定表格中修改按钮 点击事件
					var tr, // 点击的修改按钮对应的行
						tableOps = ops,
						i, j;

					// 点击修改按钮弹出模态框
					$('body')
					.off('click', '#neTable-warp table tr.neTable-tb-tr .neTableTd-modify')
					.on('click', '#neTable-warp table tr.neTable-tb-tr .neTableTd-modify', function(){
						if(!ops.operatePerm.modifiedPerm) {
							alert("没有修改权限");
							return;
						}

						tr = $(this).parents('tr').eq(0);

						neTable_modals.neTableModifyModal.modal(tableOps.modal.modalinput_indexOfModify, tr);
					});

					return true;
				})(),
				bindTableDeleteEvent = (function() { // 绑定表格中删除按钮 点击事件
					var tr, // 点击的删除按钮对应的行
						i, j;

					// 点击删除按钮弹出模态框
					$('body')
					.off('click', '#neTable-warp table tr.neTable-tb-tr .neTableTd-delete')
					.on('click', '#neTable-warp table tr.neTable-tb-tr .neTableTd-delete', function(){
						if(!ops.operatePerm.deletedPerm) {
							alert("没有删除权限");
							return;
						}

						tr = $(this).parents('tr').eq(0);

						neTable_modals.neTableDeleteModal.modal($.neTable.TIPS.MODAL_DELETE_TIP, tr);
					});

					return true;
				})(),
				bindTablePagerEvent = (function() { // 绑定分页栏的页码点击事件
					$('body')
					.off('click', '.neTable-warp .neTable-Pager .pagination > li > a[data-value]')
					.on('click', '.neTable-warp .neTable-Pager .pagination > li > a[data-value]', function(event) {
						var toPage = Number($(this).attr('data-value')),
							tableOps = ops,
							curPage = tableOps.curPage,
							tableSetting;

						if(toPage == curPage || toPage < 1 || toPage > pages) { // 如果请求的就是当前页或者超出范围，则不做出响应
							return ;
						} else {		
							tableSetting = {
								url       : tableOps.url + ops.QUERY_URL,
								"curPage" : toPage
							};
						}

						// 更新表格
						ajax_neTable(tableSetting, function(returnedJsonObj) {
							updateNE_Table(returnedJsonObj);
							updateNE_TablePager(returnedJsonObj);
						});
					});

					return true; // 事件绑定完毕
				})(),
				ajax_neTable = function(tableSetting, successCallback) { // 请求表格数据，并创建表格
					if(!ops.operatePerm.queriedPerm) {
						alert("没有查询权限");

						return;
					}

					var tableOps = ops;

					if(!tableSetting) {
						tableSetting = tableOps;
					} else {
						if($.isFunction(tableSetting.url)) {
							tableSetting.url = tableSetting.url();
						}
					}

					ajaxTableXHR = $.ajax({
						url : tableSetting.url,
						type : tableOps.type,
						dataType : tableOps.datatype,
						data : {"curPage"   : tableSetting.curPage   || tableOps.curPage,
								"rowNum"    : tableSetting.rowNum    || tableOps.rowNum,
								"sortname"  : tableSetting.sortname  || tableOps.sortname,
								"sortorder" : tableSetting.sortorder || tableOps.sortorder,
								"colNames"  : JSON.stringify(tableOps.colNames, null, " "),
								"colModel"  : JSON.stringify(tableOps.colModel, null, " "),
								"queryCondition"  : JSON.stringify(tableOps.queryCondition, null, " ")},
						success : function(returnedData) {
							var returnedJsonObj = returnedData.data.queryResult;
								pages = Math.ceil(returnedJsonObj.totalLength/tableOps.rowNum), // 获取总页数
								tableOps.tablePages = tableOps.tablePages > pages ? pages : tableOps.tablePages;

							returnedJsonObj.oldPage = tableOps.curPage; // 将请求之前的当前页加入结果集，分页栏会用到
							tableOps.curPage = tableSetting.curPage; // 请求成功后更新当前页码

							if(successCallback) { // 如果有自定义的回调函数，则执行
								successCallback(returnedJsonObj);
								return ;
							}

							// 成功接收数据后开始构建表格和分页栏
							createNE_Table(returnedJsonObj);
							createNE_TablePager(returnedJsonObj);
						}
					});
				};

			var tableSetting = {
				url       : ops.url + ops.QUERY_URL,
				"curPage" : 1
			};
			ajax_neTable(tableSetting); // 请求表格第1页

			return this;
		};

		// 添加bindButtonOfAddEvent方法, 点击这个按钮实现新增
		$.extend($.neTable, {
			bindButtonOfAddEvent : function($button) { // 给添加按钮绑定事件 
				if(!($button instanceof jQuery)) {
					throw new Error('arguments must be jQuery object');
				}

				$button.on('click', function(event) {
					neTable_modals.neTableAddModal.modal($.neTable.ops.modal.modalinput_indexOfAdd);
				});
			}
		});

		// 添加refresh方法和createModal方法
		$.extend($.neTable, {
			// 刷新表格 (在对表格进行增加或删除操作后需调用  )
			refresh : function() {
				$.neTable.ops.wrap_neTable.neTable($.neTable.ops); // 即重新生成一次表格
			},

			// 创建一个模态框并返回
			createModal : function(type) {
				function Modal()  {
					this.modalId = 'neTableModal' + MODAL_ID++; // 为每个modal建立id
					this.$modalHtml = $(Modal._modalHtml).attr('id', this.modalId);

					var neTableModalId = this.modalId,
						self = this;

					// 设置modal的标题和确定按钮点击后的回调函数
					switch (type) {
						case 'add':
							this.title = Modal.ADD_TITLE;
							this.ackSubmitHandler = function(form) {
								console.log('验证通过，新增成功！submit！');
								// 拼接要传送给后台的数据	
								var $modalForm = $('#' + neTableModalId + ' form'),
									modalInput_index = self.modalInput_index,
									modalInput_index_len = modalInput_index.length,
									addedTrData,
									i;
								for(i = 0; i < modalInput_index_len; i++) {
									addedTrData[modalInput_index[i]] = $modalForm.find('input[name=' + modalInput_index[i] + ']').val();
								}

								$(this).neTable('addRow', addedTrData); // 执行新增
							};

							break;
						case 'delete':
							this.title = Modal.DELETE_TITLE;
							this.ackSubmitHandler = function(form) {
								var id = $(self).neTable('getTrText', self.operatedTr, $.neTable.ops.colModel[0].index);

								$(this).neTable('deleteRow', id); // 执行删除
							};

							break;
						case 'modify':
							this.title = Modal.MODIFY_TITLE;
							this.ackSubmitHandler = function(form) {
								console.log('验证通过，修改成功！submit！');
								// 拼接要传送给后台的数据
								var $modalForm = $('#' + neTableModalId + ' form'),
									operatedTr = {id : $(self).neTable('getTrText', self.operatedTr, $.neTable.ops.colModel[0].index)},
									modalInput_index = self.modalInput_index,
									modalInput_index_len = modalInput_index.length,
									i;
								for(i = 0; i < modalInput_index_len; i++) {
									operatedTr[modalInput_index[i]] = $modalForm.find('input[name=' + modalInput_index[i] + ']').val();
								}

								$(this).neTable('modifyRow', operatedTr); // 执行修改
							};

							break;
						default :
							throw new Error('type should be add, delete or modify!');
					}
					this.setTitle(this.title);

					// 绑定模态框中的确认按钮事件
					$('body')
					.off('click', '#' + neTableModalId + ' #modal_ack')
					.on('click', '#' + neTableModalId + ' #modal_ack', function(event) {
						// 删除操作不需要进行表单验证
						if(type == 'delete') {
							self.ackSubmitHandler();
							return ;
						}

						var modalOps = $.neTable.ops.modal;
						// 进行模态框里的表单验证
						var validator = $('#' + neTableModalId + ' form').validate({
							rules : modalOps.modalInputValidate.rules,
							messages : modalOps.modalInputValidate.messages,
							errorClass : "input-error help-block",
							highlight: $.neTable.modalHighlight,
							unhighlight: $.neTable.modalUnhighlight,
							submitHandler : self.ackSubmitHandler
						});
					});
				}

				// 设置Modal相应字段
				Modal._ensureAndCancelBtns = '<div class="form-group">' +  // modal中最后的按钮（一般是确认和关闭两个按钮）
					'<button class="btn btn-primary" id="modal_ack" type="submit">确认</button>' +
					'<button class="btn btn-default" type="button"  data-dismiss="modal">关闭</button>' +
					'</div>';
				Modal._modalHtml = '' + // modal的html形式
					'<div class="modal fade">' +
			          '<div class="modal-dialog">' +
			            '<div class="modal-content">' +
			              '<div class="modal-header">' +
			                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
			                '<h4 class="modal-title"></h4>' +
			              '</div>' +

			              '<div class="modal-body">' +

			              '</div>' +
			            '</div>' +
			          '</div>' +
			        '</div>';
			    Modal.ADD_TITLE = '新增数据';
			    Modal.DELETE_TITLE = '删除数据';
			    Modal.MODIFY_TITLE = '修改信息';

				// 设置modal的标题的方法
				Modal.prototype.setTitle = function(t) {
					this.$modalHtml.find('.modal-header .modal-title').html(t);

					return this;
				};

				// 设置modal的内容的方法
				Modal.prototype.setContent = function(modalInput_index, operatedTr) {
					if(!modalInput_index) {
						throw new Error('you must offer modalInput_index argument!');
					}

					if(typeof modalInput_index === 'string' && operatedTr) { // 不设置输入框，只是设置字符串。 （ 删除一行时用到  ）
						this.$modalHtml.find('.modal-body').html(modalInput_index).append(Modal._ensureAndCancelBtns).find('button[type="submit"]').css('margin-left', '430px');;

						return this;
					}

					var modal_body = this.$modalHtml.find('.modal-body').empty(),
						modal_body_content = $('<form class="form-horizontal" ></form>'),
						modalInput_index_len = modalInput_index.length,
						$self = $(this),
						a = $self.neTable('getColModelIndexOfNum', modalInput_index), // 每一个input在colModel中的数字下标的集合
						input_texts = operatedTr ? $self.neTable('getTrText', operatedTr, modalInput_index) : undefined, // 每个input的内容 ( 来源于表格 )
						$perInput, // modal中的每个输入框
						neTableOps = $.neTable.ops,
						i;

					// 设置每个输入框的内容
					for(i = 0; i < modalInput_index_len; i++) {
						$perInput = $(
							'<div class="form-group">' +
								'<label class="col-sm-2 control-label">' + neTableOps.colNames[a[i]] + ':</label>' +
								'<div class="col-sm-10">' +
									(operatedTr ? ('<input class="form-control" name="' + modalInput_index[i] + '" ' + 'type="text" ' + 'value="' + input_texts[i] + '">')
									   : ('<input class="form-control" name="' + modalInput_index[i] + '" ' + 'type="text">')) +
								'</div>' +
							'</div>'
						);

						modal_body_content.append($perInput);
					}

					// 最后将标签加入modal_body 
					modal_body.append(modal_body_content.append(Modal._ensureAndCancelBtns));

					return this;
				};

				// 设置modal的modal方法,即显示模态框
				// modalInput_index : (模态框中每个输入框的index (与表格某些列的name组成的数组一致  )
				//						如果是字符串且不传入operatedTr，则表示模态框的内容
				// operatedTr(可选参数 ) : 如果有modalInput_index且没有operatedTr是创建新建一行的模态框，传入tr则创建修改一行的模态框   
				Modal.prototype.modal = function(modalInput_index, operatedTr) {
					this.modalInput_index = modalInput_index;
					this.operatedTr = operatedTr;

					// 每次模态框弹出之前，设置模态框的内容				
					this.setContent(modalInput_index, operatedTr);
					// 调用bs的modal的modal方法, 显示模态框
					this.$modalHtml.modal(); 
					
					return this;
				};

				// 设置modal的hide方法,即隐藏模态框
				Modal.prototype.hide = function() {
					// 调用bs的modal的hide方法, 隐藏模态框
					this.$modalHtml.modal('hide'); 

					return this;
				};
				
				return new Modal();
			}
		});

		// 添加方法，返回指定的index在colModel中的数字下标的集合
		$.neTable.extendJQ_fn_neTable({
			getColModelIndexOfNum : function(index) { 
				var res = [], // 要返回的集合
					index_len = index.length,
					i;

				// 找到index中的每个元素在ops .model中的下标，存入res数组
				// 这样就能找到每一个index对应第几个td
				$.neTable.ops.colModel.forEach(function(value, ind) {
				  for(i = 0; i < index_len; i++) {
				    if(value.index == index[i]) {
				      res.push(ind);
				      break;
				    }  
				  } 
				});

				return res;
			}
		});

		// 添加方法，返回某个tr中某列的内容或者所有指定列的内容的集合
		$.neTable.extendJQ_fn_neTable({
			getTrText : function(tr, td_index) { 
				var res, // 要返回的集合
					a, // td_index在colModel中的数字下标的集合
					td_index_len,
					i;

				if (typeof td_index === "string") {
					a = this.neTable('getColModelIndexOfNum', [td_index]);

					return $(tr.children('td')[a[0]]).text();
				}else if(Array.isArray(td_index)) {
					res = [];
					a = this.neTable('getColModelIndexOfNum', td_index);
					td_index_len = td_index.length;

					for(i = 0; i < td_index_len; i++) {
						res.push($(tr.children('td')[a[i]]).text());
					}
				}

				return res;
			}
		});

		// 给$.fn.neTable对象添加表格的增删改方法		
		$.neTable.extendJQ_fn_neTable({
			// 增加行
			addRow : function(addedTrData) {
				$.ajax({
					url: $.neTable.ops.url + $.neTable.ops.ADD_URL,
					type: 'post',
					dataType: 'json',
					data: {
						addedTrData: JSON.stringify(addedTrData)
					}
				})
				.done(function(data) {
					neTable_modals.neTableAddModal.hide(); // 新增完成后隐藏modal

					$.neTable.refresh(); // 刷新表格
				})
				.fail(function(xhr, textStatus, error) {
					console.log('新增失败' + ' error:' + error);
				});
			},
			// 删除行
			deleteRow : function(operatedTrId, oldPage) {
				if(!operatedTrId) {
					throw new Error('arguments error! There is not tr');
				}

				var oldPage = $('#neTable-warp tbody tr').length == 1 ?  // 执行删除操作前的页码
							  $('#neTable-warp .pagination a[class*=curPage]').attr('data-value') - 1
							  :
							  $('#neTable-warp .pagination a[class*=curPage]').attr('data-value');
				$.ajax({
					url: $.neTable.ops.url + $.neTable.ops.DELETE_URL,
					type: 'post',
					dataType: 'json',
					data: {
						id: operatedTrId
					}
				})
				.done(function(data) {
					neTable_modals.neTableDeleteModal.hide(); // 删除完成后隐藏modal

					$.neTable.ops.wrap_neTable.empty(); // 先清空之前的表格
					$.neTable.refresh(); // 然后刷新表格
					ajaxTableXHR.done(function() { // 并跳转到执行删除操作前的页码
						$('#neTable-warp .pagination a[data-value=' + oldPage + ']').trigger('click');
					});
				})
				.fail(function(xhr, textStatus, error) {
					console.log('删除失败' + ' error:' + error);
				});
			},
			// 修改行
			modifyRow : function(operatedTr) {
				if(!operatedTr) {
					throw new Error('arguments error! There is not tr');
				}

				$.ajax({
					url: $.neTable.ops.url + $.neTable.ops.MODIFY_URL,
					type: 'post',
					dataType: 'json',
					data: {
						operatedTr: JSON.stringify(operatedTr)
					}
				})
				.done(function(data) {
					neTable_modals.neTableModifyModal.hide(); // 修改完成后隐藏modal

					// 表格中更新修改的行
					var tr = $.neTable.ops.wrap_neTable.find('tbody').find('tr[neTable-tr-id="' + operatedTr.id + '"]'),
						i;

					// 依次更新
					for (i in operatedTr) {
						if(i === 'id') {
							continue;
						}

						tr.find('td[neTable-td-name="' + i + '"]').html(operatedTr[i]);
					};
					
				})
				.fail(function(xhr, textStatus, error) {
					console.log('修改失败' + ' error:' + error);
				});
			},
			// 给内容超出的td绑定点击事件，点击时显示所有内容   
			bindTextoverflowClick : function() {

			}
		});
	})();

	// 设置所有neTable相关的模态框
	(function() {
		// 1."修改"模态框
		neTable_modals.neTableModifyModal = $.neTable.createModal('modify');

		// 2."新增"模态框
		neTable_modals.neTableAddModal = $.neTable.createModal('add');

		// 3."删除"模态框
		neTable_modals.neTableDeleteModal = $.neTable.createModal('delete');

		// 将模态框添加到页面中
		var i;
		for (i in neTable_modals) {
			$('body').append(neTable_modals[i].$modalHtml);
		}
	})();
})(window, jQuery);



























