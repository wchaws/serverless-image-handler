#!/usr/bin/env python3
import os

TEMPLATE = r'''
<!DOCTYPE html>
<html>

<body>
  <table border="1" width="100%">
    <thead>
      <tr>
        <td>NO.</td>
        <td>A</td>
        <td>B</td>
      </tr>
    </thead>
    <tbody>
    {body}
    </tbody>
  </table>
</body>

</html>
'''
PATHS = [
    # watermark
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_nw',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_north',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_ne',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_west',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_center',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_east',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_sw',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_south',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,g_se',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_100,color_FFFFFF,shadow_0',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_100,color_FFFFFF,shadow_50',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_100,color_FFFFFF,shadow_100',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_30',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_500',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,size_1000',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,rotate_45',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,rotate_90',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,rotate_180',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,fill_1',
    'example.jpg?x-oss-process=image/watermark,text_SGVsbG8gV29ybGQ,fill_0',
    'example.jpg?x-oss-process=image/quality,q_70/watermark,text_4paI4paI4paI4paI,g_se,x_0,y_0,size_24,shadow_0,color_3E3E3E/watermark,text_5Yqo5Zu-,g_se,x_6,y_4,size_24,shadow_0,color_FFFFFF/resize,w_490',
    'example.jpg?x-oss-process=image/watermark,text_SG9Zb0xBQkBXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1cyNA==,size_26,color_FFFFFF,shadow_50,t_70,g_se,x_37,y_77',
]
EP_A = os.environ.get('A', 'https://image-demo-oss-zhangjiakou.oss-cn-zhangjiakou.aliyuncs.com/')
EP_B = os.environ.get('B')


def row(i, a, b):
    return '\n'.join([
        '<tr>',
        f'  <td>{i}</td>',
        f'  <td><img src="{a}" loading="lazy" alt="{a}"></td>',
        f'  <td><img src="{b}" loading="lazy" alt="{b}"></td>',
        '</tr>',
    ])


s = TEMPLATE.format(body='\n'.join([row(i, EP_A + p, EP_B + p) for i, p in enumerate(PATHS)]))
fname = 'index.html'

with open(fname, 'w') as fp:
    fp.write(s)

print(f'html has been created at {fname}')
