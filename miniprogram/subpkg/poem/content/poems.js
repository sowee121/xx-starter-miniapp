const TONES = ['sky', 'lilac', 'butter', 'matcha', 'peach', 'mint']

const RAW = [
    {
      "id": "yong-e",
      "title": "咏鹅",
      "author": "唐 · 骆宾王",
      "cover": "poem-yong-e",
      "lines": [
        {
          "text": "鹅鹅鹅，",
          "audio": "/subpkg/poem/static/audio/yong-e-line-1.mp3"
        },
        {
          "text": "曲项向天歌。",
          "audio": "/subpkg/poem/static/audio/yong-e-line-2.mp3"
        },
        {
          "text": "白毛浮绿水，",
          "audio": "/subpkg/poem/static/audio/yong-e-line-3.mp3"
        },
        {
          "text": "红掌拨清波。",
          "audio": "/subpkg/poem/static/audio/yong-e-line-4.mp3"
        }
      ],
      "fullText": "鹅鹅鹅，曲项向天歌。白毛浮绿水，红掌拨清波。",
      "fullAudio": "/subpkg/poem/static/audio/yong-e-full.mp3"
    },
    {
      "id": "jing-ye-si",
      "title": "静夜思",
      "author": "唐 · 李白",
      "cover": "poem-jing-ye-si",
      "lines": [
        {
          "text": "床前明月光，",
          "audio": "/subpkg/poem/static/audio/jing-ye-si-line-1.mp3"
        },
        {
          "text": "疑是地上霜。",
          "audio": "/subpkg/poem/static/audio/jing-ye-si-line-2.mp3"
        },
        {
          "text": "举头望明月，",
          "audio": "/subpkg/poem/static/audio/jing-ye-si-line-3.mp3"
        },
        {
          "text": "低头思故乡。",
          "audio": "/subpkg/poem/static/audio/jing-ye-si-line-4.mp3"
        }
      ],
      "fullText": "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
      "fullAudio": "/subpkg/poem/static/audio/jing-ye-si-full.mp3"
    },
    {
      "id": "min-nong",
      "title": "悯农",
      "author": "唐 · 李绅",
      "cover": "poem-min-nong",
      "lines": [
        {
          "text": "锄禾日当午，",
          "audio": "/subpkg/poem/static/audio/min-nong-line-1.mp3"
        },
        {
          "text": "汗滴禾下土。",
          "audio": "/subpkg/poem/static/audio/min-nong-line-2.mp3"
        },
        {
          "text": "谁知盘中餐，",
          "audio": "/subpkg/poem/static/audio/min-nong-line-3.mp3"
        },
        {
          "text": "粒粒皆辛苦。",
          "audio": "/subpkg/poem/static/audio/min-nong-line-4.mp3"
        }
      ],
      "fullText": "锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。",
      "fullAudio": "/subpkg/poem/static/audio/min-nong-full.mp3"
    },
    {
      "id": "chun-xiao",
      "title": "春晓",
      "author": "唐 · 孟浩然",
      "cover": "poem-chun-xiao",
      "lines": [
        {
          "text": "春眠不觉晓，",
          "audio": "/subpkg/poem/static/audio/chun-xiao-line-1.mp3"
        },
        {
          "text": "处处闻啼鸟。",
          "audio": "/subpkg/poem/static/audio/chun-xiao-line-2.mp3"
        },
        {
          "text": "夜来风雨声，",
          "audio": "/subpkg/poem/static/audio/chun-xiao-line-3.mp3"
        },
        {
          "text": "花落知多少。",
          "audio": "/subpkg/poem/static/audio/chun-xiao-line-4.mp3"
        }
      ],
      "fullText": "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。",
      "fullAudio": "/subpkg/poem/static/audio/chun-xiao-full.mp3"
    },
    {
      "id": "deng-guan-que-lou",
      "title": "登鹳雀楼",
      "author": "唐 · 王之涣",
      "cover": "poem-deng-guan-que-lou",
      "lines": [
        {
          "text": "白日依山尽，",
          "audio": "/subpkg/poem/static/audio/deng-guan-que-lou-line-1.mp3"
        },
        {
          "text": "黄河入海流。",
          "audio": "/subpkg/poem/static/audio/deng-guan-que-lou-line-2.mp3"
        },
        {
          "text": "欲穷千里目，",
          "audio": "/subpkg/poem/static/audio/deng-guan-que-lou-line-3.mp3"
        },
        {
          "text": "更上一层楼。",
          "audio": "/subpkg/poem/static/audio/deng-guan-que-lou-line-4.mp3"
        }
      ],
      "fullText": "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。",
      "fullAudio": "/subpkg/poem/static/audio/deng-guan-que-lou-full.mp3"
    },
    {
      "id": "wang-lu-shan-pu-bu",
      "title": "望庐山瀑布",
      "author": "唐 · 李白",
      "cover": "poem-wang-lu-shan-pu-bu",
      "lines": [
        {
          "text": "日照香炉生紫烟，",
          "audio": "/subpkg/poem/static/audio/wang-lu-shan-pu-bu-line-1.mp3"
        },
        {
          "text": "遥看瀑布挂前川。",
          "audio": "/subpkg/poem/static/audio/wang-lu-shan-pu-bu-line-2.mp3"
        },
        {
          "text": "飞流直下三千尺，",
          "audio": "/subpkg/poem/static/audio/wang-lu-shan-pu-bu-line-3.mp3"
        },
        {
          "text": "疑是银河落九天。",
          "audio": "/subpkg/poem/static/audio/wang-lu-shan-pu-bu-line-4.mp3"
        }
      ],
      "fullText": "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。",
      "fullAudio": "/subpkg/poem/static/audio/wang-lu-shan-pu-bu-full.mp3"
    }
]

module.exports = {
  poems: RAW.map((p, i) => ({ ...p, tone: TONES[i % TONES.length] })),
}
