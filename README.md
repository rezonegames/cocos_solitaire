# 自用框架

## 

分析上面代码的问题，现在已知的问题：1.拖拽的牌移动过程中位置不对，放下后位置也不对，应该是放下的pile的最后一个牌的位置。2.cardNode.setSiblingIndex(9999 + index);没生效。3.stock位置的牌点击应该走onClickStock， 牌落在waste位置。4.Foundation牌中间不需要有间距

## 构建流程

### 微信小游戏

#### 方式 1：手动上传
```bash
# 1. 在 Cocos Creator 中构建微信小游戏
# 2. 手动上传资源
rsync -avz ./build/wechatgame/remote/ root@saisi-dev:/var/www/html/cocos-solitaire/wechat/remote/
# 3.删除remote资源
rm -rf ./build/wechatgame/remote
# 4. 在微信开发者工具中打开项目
# 打开目录: ./build/wechatgame
```