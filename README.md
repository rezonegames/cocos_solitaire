# 自用框架

## 

分析上面代码的问题，现在已知的问题：1.拖拽的牌移动过程中位置不对，放下后位置也不对，应该是放下的pile的最后一个牌的位置。2.cardNode.setSiblingIndex(9999 + index);没生效。3.stock位置的牌点击应该走onClickStock， 牌落在waste位置。4.Foundation牌中间不需要有间距