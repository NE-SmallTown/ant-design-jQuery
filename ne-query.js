(function (global, $) {
    'use strict'

    // 创建
    $.fn.neQuery = function (queryOps) {
        var $wrap = queryOps.clearWrap ? this.empty() : this, // 生成的查询框被包裹在哪里
            neQuerySelf,
            defaultSetting = { // 所有的默认配置信息
                items: [],
                submitCallback: function() {
                    console.log('submit query!');
                }
            },
            defaultItemSetting = { // 默认的一个input组件的配置信息
                labelText: '',
                inputType: 'text',
                placeholder: '',
                queryName: '',
                defaultSubmitValue: null
            };

        // 构造函数
        function NE_Query() {
            neQuerySelf = this;

            this._init();
        }

        // 添加方法
        // 检测传入的queryOps是否有效
        NE_Query.prototype._checkParams = function() {
            // 检查queryOps是否为对象
            if(!$.isPlainObject(queryOps)) {
                throw new Error('args must be object!');
            }
        }

        // 添加字段
        NE_Query.prototype.setting = {}; // 存储所有配置

        // 初始化查询组件
        NE_Query.prototype._init = function() {            
            this._checkParams(); // 检测用户传入的参数是否合法          
            $.extend( // 根据用户传入的参数合并字段值
                true, NE_Query.prototype.setting,
                defaultSetting,
                $.extend(true, {}, queryOps, {items: queryOps.items.map(function(v, i) { // 配置信息
                    return $.extend(true, {}, defaultItemSetting, v);              
                })})
            );

            var self = this,
                createQueryItem = function(itemSetting) { // 创建单个查询组件
                    var itemHtml;

                    switch(itemSetting.inputType) {
                        case 'text':
                            itemHtml = '<div class="form-group">' +
                                            '<label class="query-label">' + itemSetting.labelText + ':</label>' +
                                            '<input type="text" class="form-control" query-name="' + itemSetting.queryName + '" placeholder="' + itemSetting.placeholder +'">' +
                                       '</div>';
                            break;
                        case 'date': //  data-date="2016-05-25 16:16"
                            itemHtml = '<div class="form-group">' +
                                            '<label class="query-label">' + itemSetting.labelText + ':</label>' +
                                            '<div class="input-group date form_time">' +
                                                '<input class="form-control" type="text" query-name="' + itemSetting.queryName + '" placeholder="' + itemSetting.placeholder +'">' +
                                                '<span class="input-group-addon"><span class="glyphicon glyphicon-remove"></span></span>' +
                                                '<span class="input-group-addon"><span class="glyphicon glyphicon-time"></span></span>' +
                                            '</div>' +
                                       '</div>';
                            break;
                        case 'radio':
                            
                            break;
                        case 'checkbox':
                            
                            break;
                        case 'select':
                            
                            break;
                        case 'submit':
                            itemHtml = '<div class="form-group has-feedback">' +
                                            '<button type="submit" class="form-control btn btn-default query-submit" opt="search">查询记录</button>' +
                                            '<span class="icon iconfont icon-search"></span>' +
                                       '</div>';
                            break;
                        default:
                            throw new Error('tyep: ' + itemSetting.inputType + ' is not supported');
                            break;
                    }

                    return itemHtml;
                },
                createQuery = function() { // 创建所有的查询组件
                    var $query_form = $('<form class="form-inline"></form>'),
                        _itemsSetting = self.setting.items,
                        itemsHtml = '',
                        i;

                    // 创建组件
                    for(i = 0; i < _itemsSetting.length; i++) {
                        itemsHtml += createQueryItem(_itemsSetting[i]);
                    }
                    itemsHtml += createQueryItem({ // 最后添加submit按钮
                        labelText: '查询',
                        inputType: 'submit',
                        placeholder: '',
                        queryName: '',
                        defaultSubmitValue: ''
                    });
                    
                    // 添加到界面中
                    $query_form.append(itemsHtml).append();
                    $wrap.append($query_form);

                    // fix一些配置                    
                    $wrap.find('.form_time').trigger('datetimepicker.load'); // 设置日期插件格式
                },
                configDateQuery = (function() { // 设置表单的日期插件格式 (需要在插件被加载后自己触发 )
                    $('body')
                    .off('datetimepicker.load', '.form_time')
                    .on('datetimepicker.load', '.form_time', function(event) {
                        $(this).datetimepicker({
                            language:  "zh-CN",
                            format: "yyyy-mm-dd hh:ii",
                            weekStart: 1,
                            startDate: "2015-05-24 10:00",
                            todayBtn:  "linked",
                            autoclose: true,
                            todayHighlight: true,
                            minView: 0,
                            maxView: 4,
                            keyboardNavigation: false,
                            minuteStep: 10,
                            pickerPosition : "bottom-left"
                        });
                    });
                }());

            createQuery();
        }

        // 绑定submit事件
        NE_Query.prototype._bindSubmitEvent = (function() {
            $('body')
            .off('click', '.tableOperation button[opt="search"]')
            .on('click', '.tableOperation button[opt="search"]', function(event) {
                var $form = $(this).parents('form'),
                    $form_query = $form.find('input[query-name]'),
                    $queryInput, // 每个查询的输入框
                    queryInput_queryName, // 每个查询的输入框的quer y-name值
                    queryInput_val,
                    queryObj = {},
                    postfixTemp = {},
                    self = neQuerySelf,
                    _itemsSetting = self.setting.items,
                    i;
                // 原来想的是这个与ne-Table耦合，所以有了下面这段注释
                // 另一种方式不用这么麻烦，就是每次都通过form去find   query-name为colModelIndexs中值的输入框
                // 将找到的输入的值按 -0，-1，-2递增的方式组合就行（如果输入框只有1个，那么就只有   -0了）
                // 但是这样每次都去find效率太低了，所有采用下面这种方式
                for (i = 0; i < $form_query.length; i++) {
                    $queryInput = $($form_query[i]);
                    queryInput_queryName = $queryInput.attr('query-name');

                    queryInput_val =

                    $queryInput.val() == "" ?
                    _itemsSetting[i].defaultSubmitValue === undefined ? null : _itemsSetting[i].defaultSubmitValue :                 
                    $queryInput.val();
                    // 检查查询条件是否只有一个 (多个查询条件从0开始递增，如  type-0,type-1)
                    // 优点：后面增加查询条件不需要改代码，只需要告诉后台字段的意义即可
                    // 缺点：如果多个查询条件的输入框（如日期）的位置发生变化，则那之后的所有字段的意义都要跟着变化
                    // 由于是个人网站，查询可以在数据库中进行，为了避免每个输入框都去配置，故
                    // 采用这种方式
                    if(!queryObj.hasOwnProperty([queryInput_queryName + '-0'])) { // 因为属性值为null，所有不能用queryObj [queryInput_queryName + '-0']来判断属性是否存在
                        postfixTemp[queryInput_queryName] = 0;
                        queryObj[queryInput_queryName + '-0'] = queryInput_val;
                    } else {
                        postfixTemp[queryInput_queryName]++;
                        queryObj[queryInput_queryName + '-' + postfixTemp[queryInput_queryName]] = queryInput_val;
                    }
                };

                // 执行回调函数
                self.setting.submitCallback(queryObj, self.setting.submitCallbackArgs);

                return false;
            });
        }());

        return new NE_Query();
    }
})(window, jQuery);