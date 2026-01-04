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
        language = {'en': {}, 'zh': {}}
        for i in range(1, nrows):
            id = table.cell(i, 0).value
            en = table.cell(i, 1).value
            zh = table.cell(i, 2).value

            language['en'][str(id)] = en
            language['zh'][str(id)] = zh

        write_json(f'../assets/{bundle_name}/language/json/en.json', language['en'])
        write_json(f'../assets/{bundle_name}/language/json/zh.json', language['zh'])

    write_language('resources-language', data)
    write_language('game1-language', data)

    def write_level(sheet_name, data):
        info = sheet_name.split("-")
        bundle_name = info[0]
        table = data.sheet_by_name(sheet_name)
        nrows = table.nrows
        level = {}
        for i in range(1, nrows):
            level_id = table.cell(i, 0).value
            max_exp = table.cell(i, 1).value
            coin = table.cell(i, 2).value
            level[str(int(level_id))] = {'max_exp': int(max_exp), 'coin': int(coin)}
        write_json(f'../assets/{bundle_name}/config/level.json', level)

    write_level('game1-level', data)

    def write_shop(sheet_name, data):
        info = sheet_name.split("-")
        bundle_name = info[0]
        table = data.sheet_by_name(sheet_name)
        nrows = table.nrows
        shop = {}
        for i in range(1, nrows):
            item_id = table.cell(i, 0).value
            name = table.cell(i, 1).value
            price_type = table.cell(i, 2).value
            price = table.cell(i, 3).value
            count_down = table.cell(i, 4).value
            image = table.cell(i, 5).value
            shop[item_id] = {
                'name': name,
                'price_type': price_type,
                'price': price,
                'count_down': count_down,
                'image': image,
                'count': name,
            }
        write_json(f'../assets/{bundle_name}/config/shop.json', shop)
    write_shop('game1-shop', data)


excel_to_json()