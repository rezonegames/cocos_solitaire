# -*- coding: utf-8 -*-

import json
import xlrd

def write_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def excel_to_json():
    # 读取 Excel 文件中的所有 Sheet
    data = xlrd.open_workbook('./config.xlsx')

    def write_language(sheet_name, data):
        info = sheet_name.split("-")
        bundle_name = info[0]
        table = data.sheet_by_name(sheet_name)
        nrows = table.nrows
        loading_language = {'en': {}, 'zh': {}}
        for i in range(1, nrows):
            id = table.cell(i, 0).value
            en = table.cell(i, 1).value
            zh = table.cell(i, 2).value

            loading_language['en'][str(id)] = en
            loading_language['zh'][str(id)] = zh

        write_json(f'../assets/{bundle_name}/language/json/en.json', loading_language['en'])
        write_json(f'../assets/{bundle_name}/language/json/zh.json', loading_language['zh'])

    write_language('loading-language', data)
    write_language('game1-language', data)

excel_to_json()