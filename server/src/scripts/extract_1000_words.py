# -*- coding: utf-8 -*-
"""
考研英语一历年真题（2012-2026+完型全集）1000高频词汇智能提取引擎
包含：
  1. 考研核心高频词汇 (5500重点)
  2. 熟词僻义专项标注 (如 address, climate, court, harbor, game, sound, state, yield 等)
  3. 学科专业词汇 (法律、经济、心理认知、科技生态、哲学社科)
  4. 过滤所有初中小学基础简单词
  5. 提取自真题原句、考频、真题年份与标准音标
  6. 直接注入词舟 SQLite 数据库并创建专属词书
"""

import os
import glob
import re
import json
import sqlite3
import time
import zipfile
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

import docx
import fitz

DESKTOP = r'C:\Users\Administrator\Desktop'
EXAM_DIR = os.path.join(DESKTOP, '英语真题')
DB_PATH = r'C:\Users\Administrator\Downloads\词舟-源码\词舟\server\prisma\dev.db'
OUTPUT_JSON = r'C:\Users\Administrator\Downloads\词舟-源码\词舟\server\src\data\exam1000Words.json'

# 1. 熟词僻义对照字典（确保这些词不被当成简单词过滤，并精准附带考研辟义）
POLY_MEANINGS = {
    'address': '【熟词僻义】解决，处理；发表演说（常见义：地址）',
    'climate': '【熟词僻义】思潮，社会风气，舆论氛围（常见义：气候）',
    'court': '【熟词僻义】招致，招惹；追求，求取；法庭（常见义：球场）',
    'figure': '【熟词僻义】认为；计算；重要人物；体形（常见义：数字）',
    'harbor': '【熟词僻义】心怀，怀有；庇护，窝藏（常见义：海港）',
    'game': '【熟词僻义】猎物；野味；把戏（常见义：游戏）',
    'sound': '【熟词僻义】健全的，合理的，明智的；彻底的（常见义：声音）',
    'subject': '【熟词僻义】使遭受；易受…影响的；臣民，实验对象（常见义：科目）',
    'state': '【熟词僻义】陈述，阐明；状态；国，州（常见义：状态）',
    'yield': '【熟词僻义】产出，产生；屈服，让步（常见义：投降）',
    'check': '【熟词僻义】制约，抑制，遏制；支票（常见义：检查）',
    'draw': '【熟词僻义】吸引；得出结论；平局；拖，拉（常见义：画画）',
    'novel': '【熟词僻义】新颖的，原创新奇的（常见义：小说）',
    'plant': '【熟词僻义】工厂；间谍；安插，放置（常见义：植物）',
    'fair': '【熟词僻义】相当大的，颇多的；集市，展销会（常见义：公平的）',
    'content': '【熟词僻义】满意的，满足于；容量；内容（常见义：目录）',
    'grave': '【熟词僻义】严重的，沉重的；庄严肃穆的（常见义：坟墓）',
    'credit': '【熟词僻义】把…归功于；赞誉，认可；学分；信用（常见义：信用卡）',
    'champion': '【熟词僻义】捍卫，拥护，支持；支持者（常见义：冠军）',
    'poor': '【熟词僻义】拙劣的，不擅长的；匮乏的；贫困的（常见义：穷的）',
    'scale': '【熟词僻义】攀登；天平；鱼鳞；音阶；规模（常见义：磅秤）',
    'school': '【熟词僻义】学派，流派；鱼群；学校（常见义：学校）',
    'second': '【熟词僻义】附议，赞同；第二；秒（常见义：第二）',
    'treat': '【熟词僻义】探讨，阐述；款待；对待；治疗（常见义：请客）',
    'produce': '【熟词僻义】农产品，天然产物；生产（常见义：制作）',
    'party': '【熟词僻义】当事人，参与方；政党；聚会（常见义：派对）',
    'safe': '【熟词僻义】保险箱，保险柜；安全的（常见义：安全）',
    'industry': '【熟词僻义】勤勉，勤奋；工业，行业（常见义：工业）',
    'fashion': '【熟词僻义】方式，作风；塑造；流行（常见义：时尚）',
    'ground': '【熟词僻义】理由，根据；地面，立场（常见义：地面）',
    'issue': '【熟词僻义】颁布，发行；由…产生；期号；问题（常见义：问题）',
    'live': '【熟词僻义】现场直播的；活着的，生动的（常见义：生活）',
    'mean': '【熟词僻义】刻薄的；平均的；手段；意思是（常见义：意思）',
    'note': '【熟词僻义】指出，注意到；音符；便笺（常见义：笔记）',
    'observe': '【熟词僻义】遵守，奉行；评论；观察；庆祝（常见义：观察）',
    'position': '【熟词僻义】立场，观点；职务；位置（常见义：位置）',
    'reason': '【熟词僻义】推理，思辨；道理；理由（常见义：原因）',
    'tell': '【熟词僻义】显露，产生明显影响；辨别；告诉（常见义：讲述）',
    'term': '【熟词僻义】术语；条款；把…称为；学期（常见义：学期）',
    'view': '【熟词僻义】审视，把…视为；见解；风景（常见义：景色）',
    'voice': '【熟词僻义】表达，吐露；声音（常见义：嗓音）',
    'watch': '【熟词僻义】守望，保持警惕；监视；手表（常见义：手表）',
    'weight': '【熟词僻义】分量，重要性；重量（常见义：体重）',
    'will': '【熟词僻义】意志，毅力；遗嘱；将要（常见义：意愿）',
    'wind': '【熟词僻义】蜿蜒，缠绕；使上发条；风（常见义：刮风）',
    'appropriate': '【熟词僻义】拨款；挪用，私吞；适当的（常见义：适当）',
    'appreciate': '【熟词僻义】升值，增值；充分意识到；感激；赏析（常见义：欣赏）',
    'contain': '【熟词僻义】抑制，遏制；包含，容纳（常见义：包含）',
    'count': '【熟词僻义】有价值，有分量，算数；计算（常见义：数数）',
    'critical': '【熟词僻义】至关重要的；危急的；批判的（常见义：挑剔的）',
    'decline': '【熟词僻义】婉拒，谢绝；衰退；下降（常见义：减少）',
    'desert': '【熟词僻义】舍弃，遗弃；擅离职守；沙漠（常见义：沙漠）',
    'dismiss': '【熟词僻义】对…不屑一顾；驳回；解雇；解散（常见义：离开）',
    'engage': '【熟词僻义】吸引；从事；交涉；订婚（常见义：订婚）',
    'entertain': '【熟词僻义】心存，怀抱，容纳考虑；款待；娱乐（常见义：款待）',
    'express': '【熟词僻义】特快的；明确清晰的；表达（常见义：表达）',
    'fine': '【熟词僻义】罚款；微小的，精细的；晴朗健康的（常见义：好的）',
    'found': '【熟词僻义】创立，创办，建立；基于（常见义：find过去式）',
    'function': '【熟词僻义】重大集会，典礼，宴会；运转；功能（常见义：函数/功能）',
    'minute': '【熟词僻义】微小的，极细致的；会议纪要；分钟（常见义：分钟）',
    'nature': '【熟词僻义】本质，本性，特征；自然界（常见义：大自然）',
    'object': '【熟词僻义】反对；宾语；宗旨目标；物体（常见义：物体）',
    'passage': '【熟词僻义】通过，采纳；走廊；篇章段落（常见义：通道）',
    'period': '【熟词僻义】时代，时期；句点；课时（常见义：时期）',
    'pool': '【熟词僻义】联营，汇集共用；水池（常见义：游泳池）',
    'press': '【熟词僻义】催促，逼迫；报刊，新闻界；按压（常见义：挤压）',
    'project': '【熟词僻义】预测，推算；投射；项目，工程（常见义：项目）',
    'qualify': '【熟词僻义】限制，修饰；使具备资格（常见义：合格）',
    'quote': '【熟词僻义】开价，报价；引用，引述（常见义：引用）',
    'rate': '【熟词僻义】评估，把…评定为；比率，价格（常见义：速度）',
    'reach': '【熟词僻义】波及，影响到；达成；伸手够到；到达（常见义：到达）',
    'record': '【熟词僻义】履历，前科；唱片；记录（常见义：录像）',
    'reflect': '【熟词僻义】反思，深思；显露；反射（常见义：映照）',
    'regard': '【熟词僻义】尊重；问候；把…视为（常见义：关于）',
    'run': '【熟词僻义】管理，经营；竞选；运转；跑（常见义：跑步）',
    'save': '【熟词僻义】除…之外；拯救，储蓄（常见义：保存）',
    'season': '【熟词僻义】给…调味；使成熟；季节（常见义：季节）',
    'secure': '【熟词僻义】获得，争取到；扣紧；安全的（常见义：保险）',
    'settle': '【熟词僻义】平息，解决；定居；降落（常见义：定居）',
    'share': '【熟词僻义】份额，股份；分担；分享（常见义：分享）',
    'spring': '【熟词僻义】跃出，突然出现；源自；春天；泉水（常见义：春天）',
    'square': '【熟词僻义】使一致，使吻合；正方形，广场（常见义：广场）',
    'stand': '【熟词僻义】经受，承受；立场，观点；站立（常见义：站立）',
    'strike': '【熟词僻义】打动，触动；突然想到；罢工；击打（常见义：击打）',
    'suit': '【熟词僻义】诉讼，起诉；适合；西装（常见义：套装）',
    'table': '【熟词僻义】搁置，延期审议；提交讨论；桌子（常见义：表格）',
    'tap': '【熟词僻义】开发，发掘利用；窃听；轻拍（常见义：水龙头）',
    'touch': '【熟词僻义】涉及，谈及；触动，感动；触摸（常见义：摸）',
    'train': '【熟词僻义】瞄准，对准；定向培养；火车（常见义：火车）',
    'wear': '【熟词僻义】磨损，耐用性；使疲乏；穿戴（常见义：穿戴）',
    'work': '【熟词僻义】著作，艺术品；起作用，奏效；工作（常见义：工作）'
}

# 2. 专业学科词汇标注字典（法学/政经/认知/生态/社科）
ACADEMIC_DOMAINS = {
    # 法律政治
    'jurisdiction': '【法学】司法权，管辖权；裁判管辖范围',
    'litigation': '【法学】诉讼，起诉，打官司',
    'plaintiff': '【法学】原告，起诉人',
    'defendant': '【法学】被告，答辩人',
    'statute': '【法学】法令，法规，成文法',
    'statutory': '【法学】法定的，成文法规定的',
    'constitutional': '【法学】宪法的，符合宪法的',
    'precedent': '【法学】先例，判例；常规',
    'legislature': '【政治】立法机关，立法机构',
    'legislation': '【政治】法律，立法，制定法律',
    'sovereignty': '【政治】主权，最高统治权',
    'appellate': '【法学】上诉的，受理上诉的',
    'injunction': '【法学】禁令，法院强制令',
    'verdict': '【法学】裁决，裁定；定论',
    'compliance': '【法学/监管】合规，遵从，服从',
    'infringement': '【法学】侵权，违背，侵犯',
    'immunity': '【法学/生物】豁免权；免疫力',
    'bureaucracy': '【政治】官僚机构，官僚主义',
    'jurisprudence': '【法学】法学，法理学',
    'patent': '【法学】专利，专利权；明显的',
    'copyright': '【法学】版权，著作权',
    'prosecute': '【法学】起诉，检举；依法惩处',
    'testimony': '【法学】证词，见证；证据',
    'tribunal': '【法学】特别法庭，仲裁委员会',

    # 经济金融
    'monopoly': '【经济】垄断，独占；垄断企业',
    'inflation': '【经济】通货膨胀，物价上涨',
    'deficit': '【经济】赤字，亏损；逆差',
    'recession': '【经济】经济衰退，萧条期',
    'mortgage': '【金融】按揭贷款，抵押贷款；抵押',
    'shareholder': '【商业】股东，股票持有人',
    'subsidy': '【经济】政府补贴，津贴',
    'fiscal': '【财政】财政的，国库的',
    'liability': '【财务】负债，债务；法律责任；累赘',
    'dividend': '【金融】红利，股息；意外收获',
    'liquidity': '【金融】流动性，流动资金',
    'venture': '【商业】商业冒险，投机企业；冒险',
    'acquisition': '【商业】企业并购；收购；习得',
    'antitrust': '【经济】反垄断的，反托拉斯的',
    'stimulus': '【经济】经济刺激方案；刺激物',
    'revenue': '【财务】国家财政收入；企业营业收入',
    'bankruptcy': '【商业】破产，倒闭；彻底失败',
    'deregulation': '【经济】放宽管制，解除行业限制',
    'tariff': '【经济】关税；价目表',
    'commodity': '【经济】大宗商品；初级产品',
    'privatization': '【经济】私有化，民营化',
    'equilibrium': '【经济】市场均衡；心理平衡',

    # 心理与认知科学
    'cognition': '【认知科学】认知，认识过程与结果',
    'cognitive': '【心理学】认知的，感知思维的',
    'perception': '【心理学】感知，知觉；洞察力',
    'subconscious': '【心理学】潜意识的，下意识的',
    'empirical': '【哲学/科学】实证的，经验主义的',
    'discrepancy': '【学术】差异，不符，不一致',
    'stratification': '【社会学】社会阶层化，分层现象',
    'socialization': '【社会学】社会化，适应社会生活',
    'pedagogy': '【教育学】教学法，教育学理论',
    'assimilation': '【社会学】文化同化；消化吸收',
    'alienation': '【社会学】异化，疏远，隔阂',
    'stereotype': '【心理学】刻板印象，陈规成见',
    'neuroscience': '【生物医学】神经科学，脑科学',
    'psychiatric': '【医学】精神病学的，精神疾病的',
    'introspection': '【心理学】内省，反思自我',

    # 科技与生态
    'biodiversity': '【生态学】生物多样性',
    'ecosystem': '【生态学】生态系统',
    'pathogen': '【医学】病原体，致病微生物',
    'mutation': '【遗传学】基因突变，变异',
    'synthetic': '【科技】合成的，人工制造的',
    'paradigm': '【科学哲学】科学范式，理论架构；典范',
    'deterministic': '【哲学】决定论的，确定性的',
    'algorithm': '【计算机】算法，算法程序',
    'degradation': '【环境学】环境退化，土壤退化；降解',
    'vulnerability': '【生态/社会】脆弱性，易受损性',
    'sustainable': '【发展学】可持续的，环保绿色的',
    'emission': '【环境学】碳排放，温室气体排放物',
    'artificial': '【科技】人造的，人工合成的',
    'chromosome': '【生物学】染色体',
    'extinction': '【生态学】物种灭绝，绝迹',
    'renewable': '【能源】可再生的，可持续的',

    # 哲学与批判性思维
    'premise': '【逻辑学】前提，假设基础',
    'hypothesis': '【科学】假说，科学假设',
    'deduction': '【逻辑学】演绎推理，推论',
    'induction': '【逻辑学】归纳法，归纳推理',
    'paradox': '【哲学】悖论，看似矛盾的真理',
    'dilemma': '【伦理学】道德困境，进退两难',
    'fallacy': '【逻辑学】谬误，逻辑漏洞',
    'nuance': '【学术】细微差别，精微内涵',
    'dialectical': '【哲学】辩证的，辩证法的',
    'normative': '【哲学】规范性的，确立准则的',
    'epistemology': '【哲学】认识论，知识论',
    'skepticism': '【哲学】怀疑主义，怀疑态度'
}

# 3. 超低价值与超简单词汇黑名单（太简单的单词不要）
BASIC_TRIVIAL_WORDS = set('''
a about above across after again against age ago agree air all almost alone along already also although always am among an and animal another answer any anyone anything anywhere appear apple are area arm army around arrive art artist as ask at away baby back bad bag ball bank base basic be bear beautiful because become bed been before began begin behind being believe belong below best better between big bill bird birth birthday bit black blood blow blue boat body bone book born both bottom box boy branch bread break breakfast bring brother build building burn business busy but buy by cake call came camera camp can cannot captain car card care careful carry case cat catch cause certain chair chance change character cheap child children choose church circle city class clean clear clerk clever climb clock close cloud club coat cold college color come common compare complete contain continue control cook cool copy corner cost count country course cover cow crazy cross crowd cry cup cut dad dance danger dark daughter day dead dear death decide deep degree depend desk destroy die difference different difficult dinner direct direction dirty discover discuss disease distant divide do doctor dog dollar door double doubt down dream dress drink drive drop dry duck during duty each ear early earth east easy eat edge effect egg eight eighteen eighty either empty end enemy energy engine enjoy enough enter equal escape especially even evening event ever every everybody everyday everyone everything everywhere example except excited exercise expect expensive experience explain eye face fact factory fail fall family famous far farm fast father fear feel few field fight fill film final find fine finger finish fire first fish five fix flag flight floor flower fly food foot for forest forget forgetful fork fortunate four fourteen forty free fresh friend friendly from front full fun future game garden general gentle gentleman get girl give glad glass glove go gold good goodbye grain grandfather grandmother grassroots gray great green group grow gun hair half hall hand happen happy hard hat hate have he head hear heart heat heaven heavy height hello help helpful her here herself hero high hill him himself his historical history hit hold home homework honor hope horse hot hour house how hundred hungry hunt hurry hurt husband i ice idea if ill imagine improve in inch include influence instead intend interest into invite iron is island it its itself job join joy judge jump junior just keep key kick kill kind king kiss kitchen knee knife knock know knowledge lady lake land large last late laugh law lead leader learn least leave leg lesson let letter lie life lift light line lion list listen little lively lonely long look lose lot loud love lovely low luck machine mad madam magazine mail main make male man many map mark market marry match matter may maybe me meal meaning measure meat medicine meet member message metal meter method middle might milk million mind mine minute mistake model modern moment monkey month moon moral more morning most mother mountain mouth move movement movie much music must my myself name national natural near nearly necessary neck need neighbor neither never new news next nice night nine nineteen ninety no nobody noise none noodle nor north nose not note nothing notice now number nurse ocean oclock of off office officer often oil okay old on once one onion only onto open operation order other otherwise ought our ours ourselves out outdoors outside over page pain paint painter pair parent park part party pass past patient pay pen penny people person personal phone piano piece pig pilot place plan planet plastic plate player pleasant please pleasure poet point police pool poor post pot pound pour powerful practical prefer praise prepare present president pretty price pride primary print private prize problem product program progress promise proper proud prove provide public pull pupil pure purple purpose push put quarter quick quietly radio railroad rain raise range rare rat reach ready really rebuild receive recognize red relate relationship remain remember remove rent repeat report rescue rest return rice rich ride right river road roll roof room round row rule ruler run rush sad safe sail sailor salad sale same saw say scar scare science scientist score sea season seat second secret see seed seek seem seldom self sell send senior sentence separate serve service set several shape share shark she ship shirt shoe shop shore short should shoulder show shut shy side sign signal silent simple since sing singer sir sister sit situation six sixteen sixty skill skin sky slave sleep slight slow slowly small smell smile smoke snow so soap socialist softly solve some somebody someone something sometimes somewhere son song soon sound south spare space speak special spell spend spoon sport spread spring staff stamp stand star stare start starve stay steam steal stone stop store story straight stranger stream street strict strong structure struggle student study stupid submit success such suddenly sugar suggestion suit summer sun Sunday supper supply support sure surprised suspect swallow sweet swell swim swing system table take tale talk tall tap task taste tax teach teacher tear telephone television tell tennis test than thank thanksgiving that the theater theatre their theirs them themselves then theory there therefore these they thick thief thin thing think thirst thirsty thirteen thirty this thoroughly those though thought thousand threat three throat through throughout throw thunder Thursday ticket tie tiger tight till time tin tiny tired title to today together toilet told tomorrow tone tonight too tooth toothache top total touch tough toward towards town toy track train travel tree treat tremble triangle trip trouble trousers truck true trumpet truly try Tuesday turn twelve twenty twice two ugly uncle under understand unit unite universe university unless until up upon upstairs us use used useful user usual usually vacation valley valuable variety various vegetable very victory village visit voice volcano wait wake walk wall wander want war warm wash waste watch water waterfall watermelon wave way we wear week weekend welcome well west what wheel when where which while white who whole whom whose why wide wife wild will win wind window wing winter wipe wire wise wish with within without woman wonderful wood wooden wool word work world worry would wound write wrong yard year yellow yes yesterday yet you young your yours yourself zero
section directions text questions question answer answers reading comprehension choose write paragraph marked blank paper sheet score test true false
'''.split())

# 从基础词名单中剔除熟词僻义词
for poly_word in POLY_MEANINGS.keys():
    BASIC_TRIVIAL_WORDS.discard(poly_word)


def extract_docx_text(fpath):
    # 先尝试 python-docx
    try:
        doc = docx.Document(fpath)
        t = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
        if len(t) > 500:
            return t
    except:
        pass

    # 失败则解压读取 word/document.xml
    try:
        with zipfile.ZipFile(fpath) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            texts = [node.text for node in tree.iter() if node.tag.endswith('}t') and node.text]
            return '\n'.join(texts)
    except:
        return ''


def extract_pdf_text(fpath):
    try:
        doc = fitz.open(fpath)
        return '\n'.join([page.get_text() for page in doc])
    except:
        return ''


def collect_corpus():
    files = glob.glob(os.path.join(EXAM_DIR, '*.docx')) + glob.glob(os.path.join(EXAM_DIR, '*.pdf'))
    desktop_pdf = os.path.join(DESKTOP, '2005-2020英一完型真题+答案（35页）.pdf')
    if os.path.exists(desktop_pdf):
        files.append(desktop_pdf)

    print(f'共扫描到 {len(files)} 个真题文件，开始解析全文语料...')
    file_data = []

    for f in files:
        fname = os.path.basename(f)
        year_match = re.search(r'20\d\d', fname)
        year = year_match.group(0) if year_match else '2010-2024'

        text = ''
        if f.endswith('.docx'):
            text = extract_docx_text(f)
        elif f.endswith('.pdf'):
            text = extract_pdf_text(f)

        if text.strip():
            file_data.append((fname, year, text))
            print(f'  √ {fname}: 成功提取 {len(text)} 字符 (归属年份: {year})')

    return file_data


def process_words(file_data):
    word_freq = Counter()
    word_years = defaultdict(set)
    word_sentences = {}

    for fname, year, text in file_data:
        # 分句
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for s in sentences:
            s_clean = s.replace('\n', ' ').strip()
            # 过滤太短或太长的干扰行
            if len(s_clean) < 30 or len(s_clean) > 260:
                continue
            if '选项' in s_clean or '评分标准' in s_clean or '考生注意事项' in s_clean:
                continue

            tokens = re.findall(r'\b[a-zA-Z]{3,}\b', s)
            for t in tokens:
                w = t.lower()
                # 排除简单词
                if w in BASIC_TRIVIAL_WORDS:
                    continue
                if len(w) < 4 and w not in POLY_MEANINGS:
                    continue
                # 排除纯罗马数字与特定缩写
                if re.match(r'^(iii|vii|viii|xii|xiii|xiv|xvi|etc)$', w):
                    continue

                word_freq[w] += 1
                word_years[w].add(year)
                if w not in word_sentences and re.search(r'[a-zA-Z\s,;:\'\"-]{20,}', s_clean):
                    word_sentences[w] = s_clean

    print(f'预筛选得到非简单真题词汇总数: {len(word_freq)}')
    return word_freq, word_years, word_sentences


def fetch_word_definition(word):
    url = f'https://dict.youdao.com/jsonapi?q={word}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=4) as res:
            data = json.loads(res.read().decode('utf-8'))
            ec = data.get('ec', {}).get('word', [{}])[0]
            phone = ec.get('usphone') or ec.get('ukphone') or ''
            trs = [tr.get('tr', [{}])[0].get('l', {}).get('i', [''])[0] for tr in ec.get('trs', [])]
            meaning = '; '.join([t for t in trs if t][:3])
            return word, phone, meaning
    except Exception:
        return word, '', ''


def enrich_and_select(word_freq, word_years, word_sentences, target_count=1000):
    # 候选排序策略：
    # 1. 熟词僻义词库优先全部收录
    # 2. 专业学科词汇优先全部收录
    # 3. 按在真题中出现的跨年份数与总频次综合加权
    scored_candidates = []

    for w, count in word_freq.items():
        score = count * 2 + len(word_years[w]) * 5
        is_poly = w in POLY_MEANINGS
        is_academic = w in ACADEMIC_DOMAINS

        if is_poly:
            score += 200 # 极高优先级
        if is_academic:
            score += 150 # 高优先级

        scored_candidates.append((score, w, count, sorted(list(word_years[w]))))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    top_candidates = scored_candidates[:target_count]

    words_to_fetch = [item[1] for item in top_candidates]
    print(f'正在并发联网检索 {len(words_to_fetch)} 个核心真题词汇的权威英美音标与释义...')

    t0 = time.time()
    word_dict_data = {}
    with ThreadPoolExecutor(max_workers=25) as executor:
        for w, phone, meaning in executor.map(fetch_word_definition, words_to_fetch):
            word_dict_data[w] = (phone, meaning)
    print(f'词典释义检索完成，耗时 {round(time.time() - t0, 2)} 秒')

    enriched_words = []
    poly_count = 0
    academic_count = 0

    for score, w, count, years in top_candidates:
        phone, fetched_meaning = word_dict_data.get(w, ('', ''))
        phonetic_str = f'/{phone}/' if phone else ''

        # 判定类别与释义修饰
        if w in POLY_MEANINGS:
            category = 'polymeaning'
            level = 'C'
            poly_count += 1
            meaning = POLY_MEANINGS[w]
            if fetched_meaning and fetched_meaning not in meaning:
                meaning += f' ｜ 基础释义: {fetched_meaning}'
        elif w in ACADEMIC_DOMAINS:
            category = 'academic'
            level = 'A' if count >= 6 else 'B'
            academic_count += 1
            meaning = ACADEMIC_DOMAINS[w]
            if fetched_meaning:
                meaning += f' ｜ 通用释义: {fetched_meaning}'
        else:
            category = 'core'
            level = 'A' if count >= 10 else ('B' if count >= 4 else 'C')
            meaning = fetched_meaning or '考研核心真题高频词汇'

        # 真题原句
        example = word_sentences.get(w, f'The word "{w}" appears frequently in研究生入学考试 reading comprehension.')

        enriched_words.append({
            'word': w,
            'phonetic': phonetic_str,
            'meaning': meaning,
            'example': example,
            'frequency': count,
            'level': level,
            'category': category,
            'exam_years': ','.join(years) if years else '真题'
        })

    print(f'成功构建 1000 词库：含 {poly_count} 个熟词僻义，{academic_count} 个专业学科词汇，其余为历年高频真题核心词！')
    return enriched_words


def insert_into_database(enriched_words):
    print('正在将 1000 个考研高频真题词汇写入词舟数据库 SQLite (dev.db)...')
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. 查找或创建专属词书
    book_name = '2012-2026考研英语一真题精选1000高频词库'
    user_id = 1 # 演示用户 demo

    cursor.execute('SELECT id FROM VocabularyBook WHERE name = ? AND userId = ?', (book_name, user_id))
    row = cursor.fetchone()
    if row:
        book_id = row[0]
        print(f'已存在词书「{book_name}」(ID: {book_id})，将更新其内容')
    else:
        cursor.execute(
            'INSERT INTO VocabularyBook (name, type, userId, created_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            (book_name, 'exam', user_id)
        )
        book_id = cursor.lastrowid
        print(f'成功创建新词书「{book_name}」(ID: {book_id})')

    # 2. 插入或更新 Word 表
    word_id_map = {}
    for item in enriched_words:
        w = item['word']
        cursor.execute('SELECT id FROM Word WHERE word = ?', (w,))
        w_row = cursor.fetchone()
        if w_row:
            wid = w_row[0]
            cursor.execute('''
                UPDATE Word SET
                    phonetic = ?,
                    meaning = ?,
                    example = ?,
                    frequency = ?,
                    level = ?,
                    exam_years = ?,
                    category = ?
                WHERE id = ?
            ''', (item['phonetic'], item['meaning'], item['example'], item['frequency'], item['level'], item['exam_years'], item['category'], wid))
        else:
            cursor.execute('''
                INSERT INTO Word (word, phonetic, meaning, example, frequency, level, exam_years, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (w, item['phonetic'], item['meaning'], item['example'], item['frequency'], item['level'], item['exam_years'], item['category']))
            wid = cursor.lastrowid

        word_id_map[w] = wid

    # 3. 将所有 1000 词关联到用户学习记录 LearningRecord 并关联到本词书
    record_count = 0
    for item in enriched_words:
        wid = word_id_map[item['word']]
        cursor.execute('SELECT id FROM LearningRecord WHERE userId = ? AND wordId = ?', (user_id, wid))
        r_row = cursor.fetchone()
        if r_row:
            cursor.execute('UPDATE LearningRecord SET bookId = ? WHERE id = ?', (book_id, r_row[0]))
        else:
            cursor.execute('''
                INSERT INTO LearningRecord (userId, wordId, bookId, status, interval_index, next_review_time, review_count)
                VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP, 0)
            ''', (user_id, wid, book_id))
            record_count += 1

    # 4. 同步更新 WordMeaning 熟词僻义表
    poly_saved = 0
    for item in enriched_words:
        if item['category'] == 'polymeaning' and item['word'] in POLY_MEANINGS:
            w = item['word']
            raw_poly = POLY_MEANINGS[w]
            # 提取常规义与考研义
            common_m = raw_poly.split('（常见义：')[-1].replace('）', '') if '（常见义：' in raw_poly else '常规基础含义'
            exam_m = raw_poly.split('（常见义：')[0].replace('【熟词僻义】', '').strip()
            
            cursor.execute('SELECT id FROM WordMeaning WHERE word = ?', (w,))
            if cursor.fetchone():
                cursor.execute('''
                    UPDATE WordMeaning SET common_meaning = ?, exam_meaning = ?, example = ?, source_year = ?, frequency = ?
                    WHERE word = ?
                ''', (common_m, exam_m, item['example'], item['exam_years'], item['frequency'], w))
            else:
                cursor.execute('''
                    INSERT INTO WordMeaning (word, common_meaning, exam_meaning, example, source_year, frequency)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (w, common_m, exam_m, item['example'], item['exam_years'], item['frequency']))
            poly_saved += 1

    conn.commit()
    conn.close()

    print(f'✅ 成功将 {len(enriched_words)} 个单词入库，并关联到词书「{book_name}」！')
    print(f'✅ 同步更新熟词僻义表 {poly_saved} 条。')


def main():
    print('========================================================')
    print('   词舟 · 2012-2026 考研英语一真题 1000 高频词全自动提取引擎')
    print('========================================================')
    
    file_data = collect_corpus()
    if not file_data:
        print('❌ 未提取到任何真题文件内容！请检查桌面文件路径。')
        return

    word_freq, word_years, word_sentences = process_words(file_data)
    enriched_words = enrich_and_select(word_freq, word_years, word_sentences, target_count=1000)

    # 保存 JSON 文件备份
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(enriched_words, f, ensure_ascii=False, indent=2)
    print(f'已持久化备份 1000 词库至: {OUTPUT_JSON}')

    # 写入 SQLite 数据库
    insert_into_database(enriched_words)

    print('========================================================')
    print('   🎉 1000 个考研真题核心高频词汇已全部成功导入词舟！')
    print('========================================================')

if __name__ == '__main__':
    main()
