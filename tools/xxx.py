# -*- coding: utf-8 -*-

import json
import xlrd

def write_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def excel_to_json():
    # 读取 Excel 文件中的所有 Sheet
    data = xlrd.open_workbook('./config.xlsx')

    # 读loading语言
    def write_loading(data):
        table = data.sheet_by_name('loading-language')
        nrows = table.nrows
        loading_language = {'en': {}, 'zh': {}}
        for i in range(1, nrows):
            id = table.cell(i, 0).value
            en = table.cell(i, 1).value
            zh = table.cell(i, 2).value

            loading_language['en'][str(id)] = en
            loading_language['zh'][str(id)] = zh
        write_json('../assets/loading/language/json/en.json', loading_language['en'])
        write_json('../assets/loading/language/json/zh.json', loading_language['zh'])
        # print(json.dumps(loading_language, ensure_ascii=False))

    write_loading(data)

excel_to_json()