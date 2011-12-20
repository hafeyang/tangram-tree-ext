/*
*	tangram.tree.checkbox.js
*	add support for tangram tree
*	@option.checkbox :true/false 
*	@option.checkMode :1-single check,2-multiple check(default),3-casacade check 
*	@function getCheckNodes(withIndeterminate) : get checked  nodes  ,withIndeterminate : true/false ,with Indeterminate?
*	@author yanghengfeng@baidu.com
*/
(function(){
	
	//为方法添加一个切面(重写)
	function inheritFunction(Clazz,fnName,ext){
		var oldFn= Clazz.prototype[fnName] ;
		Clazz.prototype[fnName] = function(){
			var args = Array.prototype.slice.apply(arguments);
			args.push(oldFn.apply(this,args));
			ext.apply(this,args);//扩展方法的最后一个参数是原方法的调用结果
		};
	}	

	//重写_createTextStringArray实现checkbox显示
	//_createTextStringArray的源码
	/*_createTextStringArray: function() {
		var me = this,
			text = (me.href ? me._createHrefStringArray() : me.text),
			stringArray = me._stringArray;
		stringArray.push('<span title="',me.title || me.text,'" id="',
			me.id,'-text" >',text,'</span></span>');
	},*/
	inheritFunction(baidu.ui.Tree.TreeNode,"_createTextStringArray",function(){
		var me=this,treeInstance=me.getTree(),stringArray=me._stringArray;nodetext = stringArray[stringArray.length-2];
		if(treeInstance.checkMode==3 && me.type=="trunk" && me.checked ){
			me.checked=false;
		}
		if(treeInstance.checkMode==1 && me.checked){
			if(!treeInstance._singlechecked) {//singlechecked:单选的
				treeInstance._singlechecked=me.id;
			}else{
				me.checked=false;
			}
		}
		if(treeInstance.checkbox===true){
			stringArray[stringArray.length-2]=("<input class='tangram-tree-checkbox' autocomplete='off' type='checkbox' "+(me.checked?" checked='checked' ":"")+" id='"+me.id+"-checkbox'/><label class='tangram-tree-checkbox-label'  for='"+me.id+"-checkbox'>"+nodetext+"</label>");
		}
	});
	
	//使用钩子更新级联选择&&树节点发生变化(方法->对应钩子方法/事件)
	// appendData		->appendData
	// appendTo			->_updateAll
	// moveTo			->_updateAll
	// appendChild		->_updateAll
	// removeAllChildren->_updateAll
	// removeChild		->_updateAll
	// update			->update

	//树初始加载数据也调用了appendData方法
	inheritFunction(baidu.ui.Tree.TreeNode,"appendData",function(data){
		var me =this,treeInstance=me.getTree(),nodeid= me.id;
		if(data.length && treeInstance.checkMode==3){
			treeInstance.updateAllCheckBox(baidu.dom.g(nodeid+"-subNodeId"))
		}
	});	

	inheritFunction(baidu.ui.Tree.TreeNode,"_updateAll",function(){
		var me=this,treeInstance=me.getTree();
		console.log("_updateAll");
		if(treeInstance.checkMode==3){
			treeInstance.updateAllCheckBox()
		}
	});
	
	inheritFunction(baidu.ui.Tree.TreeNode,"update",function(nodedata){
		var me=this,treeInstance=me.getTree(),nodeid=me.id,nodetext = me.text;
		baidu.g(nodeid+"-text").innerHTML=("<input class='tangram-tree-checkbox' autocomplete='off' type='checkbox' "+(me.checked?" checked='checked' ":"")+" id='"+me.id+"-checkbox' /><label class='tangram-tree-checkbox-label'  for='"+me.id+"-checkbox'>"+nodetext+"</label>");
		if(treeInstance.checkMode==3){
			treeInstance.updateAllCheckBox(baidu.dom.g(me.getParentNode().id+"-subNodeId"))
		}
	});

	//checkbox addon
	baidu.ui.Tree.register(function(treeInstance){
		treeInstance.updateCheckBox = function(sourcecb){
			var me =this,nodeid=sourcecb.id.replace(/-checkbox$/i,""),node= me.getTreeNodeById(nodeid);
			//单选去除现有选项
			if(me.checkMode==1){
				var $checked = baidu.dom.query(".tangram-tree-checkbox:checked",me.getMain());
				for(var i=0,l=$checked.length;i<l;i++){
					var $curchecked = $checked[i],checkedId= $curchecked.id.replace(/-checkbox/i,""),checkedNode = me.getTreeNodeById(checkedId);
					if(checkedId!=nodeid){
						checkedNode.checked=false;
						checkedNode.indeterminate=false;
						$curchecked.checked=false;
					}
				}
				//更新_singlechecked
				if(me._singlechecked)delete me._singlechecked;
				if(sourcecb.checked) me._singlechecked = nodeid;
			}
			//保存状态
			node.indeterminate = sourcecb.indeterminate;
			node.checked = sourcecb.checked;
			//级联选择
			if(me.checkMode==3){
				var curNode = node ;
				//parent->parent
				while(curNode.parentNode){
					var parentNode= curNode.parentNode,siblings =parentNode.getChildNodes(),checkedLen=0,$parent=baidu.dom.g(parentNode.id+"-checkbox");
					for(var i=0,l=siblings.length;i<l;i++){
						if(siblings[i].checked || siblings[i].indeterminate) checkedLen++;
					}
					$parent.checked = (checkedLen==siblings.length);
					$parent.indeterminate  = (checkedLen!=0 && checkedLen!=siblings.length);
					parentNode.checked = $parent.checked;
					parentNode.indeterminate = $parent.indeterminate;
					curNode= curNode.parentNode;
				}
				//->children
				var childrencbs = baidu.dom.query(">dd :checkbox",baidu.dom.g(nodeid+"-node").parentNode);
				for(var i=0,l=childrencbs.length;i<l;i++){
					var c = childrencbs[i],cnode = me.getTreeNodeById(c.id.replace(/-checkbox/i,""));
					cnode.indeterminate = false;
					cnode.checked = node.checked;
					c.indeterminate = false;
					c.checked = node.checked;
				}
			}
		}
		treeInstance.updateAllCheckBox= function(context){
			var me=this;
			var leafCheckBox=baidu.dom.query("dl:has(dt:has(:checkbox)):has(>dd:empty)",context||me.getMain());
			for(var i=0,l=leafCheckBox.length;i<l;i++){
				me.updateCheckBox(baidu.dom.query(">dt :checkbox",leafCheckBox[i])[0]);
			}
		}
		treeInstance.addEventListener("onload",function(){
			var me=this,$tree= me.getMain();
			baidu.event.on($tree,"click",function(evt){
				//获取触发事件的原始DOM节点
				var target = evt.target||evt.srcElement,targetClassName= target.className||"";
				if(targetClassName.indexOf("tangram-tree-checkbox")!=-1 && (target.type||"").toLowerCase()=="checkbox"){
					me.updateCheckBox(baidu.dom.g(target.getAttribute("for")||target.id));
				}
			});
		});
		treeInstance.addEventListener("dispose",function(){
			var me=this,$tree= me.getMain();
			baidu.event.un($tree,"click");
		});
		
		//checkbox有关的方法
		treeInstance.getCheckedNodes= function(withIndeterminate){
			var me=this,checkedNodes=[];
			if(me.checkMode==1){
				if(me._singlechecked){
					checkedNodes.push(me.getTreeNodeById(me._singlechecked));
				}
				return checkedNodes;
			}
			//遍历树节点
			var root= me.getRootNode(),arr=[root],currentIndex=0;
			if(root.checked || (withIndeterminate && root.indeterminate)) checkedNodes.push(root);
			while(currentIndex<arr.length){
				var cnode = arr[currentIndex],children= cnode.getChildNodes()||[];
				for(var i=0,l=children.length;i<l;i++){
					var c= children[i];
					if(c.checked || (withIndeterminate && c.indeterminate)) checkedNodes.push(c);
					arr.push(c);
				}
				currentIndex++;
			}
			return checkedNodes;
		}
	});

})()

