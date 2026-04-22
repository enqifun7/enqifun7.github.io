from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__)
# 允许前端跨域访问
CORS(app)

# ==========================================
# 配置 DeepSeek API 信息
# ==========================================
DEEPSEEK_API_KEY = "sk-3b916031168240499f925bc727ab70f7" 
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

def call_agent(system_prompt, user_prompt, require_json=False):
    """
    封装一个通用的调用大模型的函数，方便多个 Agent 复用
    """
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False
    }
    
    if require_json:
        payload["response_format"] = {"type": "json_object"}

    response = requests.post(DEEPSEEK_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()['choices'][0]['message']['content']


@app.route('/api/recommend', methods=['POST'])
def generate_recommendation():
    data = request.json
    taste = data.get('taste', '不限')
    budget = data.get('budget', '不限')
    health = data.get('health', '不限')

    user_input_str = f"口味：{taste} | 预算：{budget} | 健康目标：{health}"

    try:
        # ==========================================
        # 🟢 第一步：Agent 1 - 用户画像与需求分析师 (Profiler)
        # ==========================================
        agent1_system = """
        你是一个极其敏锐的“用户画像侦探与营养学量化师”。
        你的任务是根据用户输入的极简词汇（口味、预算、健康目标），推理出他们的真实生活状态，并制定出严格的饮食红线。
        请直接输出一段紧凑的分析报告，包含：
        1. 隐藏身份预判（如：月底吃土的男大学生、久坐发胖的白领）
        2. 预算红线（这笔钱具体到一顿饭能买什么等级的食材）
        3. 营养核心策略（如：禁绝劣质碳水、必须增加饱腹感防下午犯困）
        不要废话，直接给出高密度的分析。
        """
        
        # 让 Agent 1 先思考，这相当于给了大模型一个“Chain of Thought (思维链)”的空间
        profiler_analysis = call_agent(agent1_system, f"分析这个用户：{user_input_str}", require_json=False)
        
        # print("Agent 1 的分析结果：", profiler_analysis) # 你可以在后端控制台打印出来看看有多神

        # ==========================================
        # 🔵 第二步：Agent 2 - 极客主厨 (Chef)
        # ==========================================
        agent2_system = """
        # Role: 顶尖生活黑客型 AI 主厨 (Life Hacker Chef)
        你是一位兼具米其林味觉与极客生存智慧的主厨。现在，你的分析师搭档已经为你提供了一份极具深度的【用户画像与约束条件】。
        
        # Task:
        请严格根据分析师提供的约束条件，为该用户设计今日的一日三餐。
        预算极低时，必须推荐便利店（全家/7-11）、沙县小吃或食堂的具体点单策略；预算充足时，推荐轻食或高品质食材。

        # Tone & Style:
        - 语气：犀利、幽默、像个靠谱的大佬朋友。
        - 态度：带有“听我的准没错”的自信，给出极其具体的实操指令（比如“买某某牌子的全麦面包”或“点菜时备注少油”）。

        # Output Constraints (严格遵守):
        1. 必须且只能输出合法的 JSON 格式。
        2. 绝不能包含任何 Markdown 标记（如 ```json ）。
        3. JSON 内部的文本，请使用 \\n 来进行换行排版，并使用特定的 Emoji 增强视觉表现力。

        # JSON 模板：
        {
            "breakfast": "【🕵️ 状态诊断】...(根据分析师报告，一句话点破痛点)\\n【🎯 极客食谱】...(极速获取的具体食物)\\n【🧠 为什么这么吃】...(背后的逻辑)",
            "lunch": "【⚡ 场景预判】...(应对中午的挑战，如防犯困)\\n【🎯 极客食谱】...(极其具体的搭配)\\n【⚠️ 避坑指令】...(外卖或食堂的具体避坑操作)",
            "dinner": "【🌙 夜间策略】...(晚餐目标)\\n【🎯 极客食谱】...(低负担的食物)\\n【💡 救急加餐】...(半夜饿了绝不会胖的零食)"
        }
        """
        
        # 把用户的原始需求和 Agent 1 的深度分析，一起喂给 Agent 2
        agent2_prompt = f"【用户原始输入】\n{user_input_str}\n\n【分析师的深度画像与红线】\n{profiler_analysis}\n\n请基于以上信息，生成最终的 JSON 三餐方案。"
        
        final_json_str = call_agent(agent2_system, agent2_prompt, require_json=True)
        
        # 解析 Agent 2 返回的 JSON
        result_dict = json.loads(final_json_str)
        
        return jsonify({
            "status": "success",
            "data": result_dict
        })

    except Exception as e:
        print("调用 DeepSeek 接口出错:", e)
        return jsonify({"status": "error", "message": "AI 营养师协作网络出现波动，请重新点击生成试试！"}), 500

# 将这段代码粘贴在 app.py 底部（if __name__ == '__main__': 的上方）

@app.route('/api/takeout', methods=['POST'])
def generate_takeout():
    # 获取前端传来的、刚才大模型生成的食谱数据
    data = request.json
    recipe_text = f"早餐：{data.get('breakfast')}\n午餐：{data.get('lunch')}\n晚餐：{data.get('dinner')}"

    try:
        # ==========================================
        # 🟠 第三步：Agent 3 - 外卖点单老手 (Takeout Specialist)
        # ==========================================
        agent3_system = """
        你是一个资深“外卖点单老手”，深谙各类外卖平台的商家套路。
        你的任务是：根据我提供的【今日三餐食谱】，为每顿饭推荐一个【极其逼真】的虚拟外卖订单。
        
        要求：
        1. 店铺名要有本土真实感（如：“张姐烤肉拌饭(大学城店)”、“田老师红烧肉”、“Wagas轻食(CBD店)”等）。
        2. 具体菜品要和提供的食谱高度相关。
        3. 价格要符合大众认知（必须带上货币符号，如 ¥18.5）。
        
        # Output Constraints (严格遵守):
        1. 必须且只能输出合法的 JSON 格式。
        2. 绝不能包含任何 Markdown 标记（如 ```json ）。
        
        # JSON 模板：
        {
            "breakfast": {"shop": "店名", "dish": "具体菜品组合", "price": "¥XX"},
            "lunch": {"shop": "店名", "dish": "具体菜品组合", "price": "¥XX"},
            "dinner": {"shop": "店名", "dish": "具体菜品组合", "price": "¥XX"}
        }
        """
        
        # 调用大模型，将食谱喂给 Agent 3
        final_json_str = call_agent(agent3_system, f"请把以下食谱转化为具体的外卖方案：\n{recipe_text}", require_json=True)
        result_dict = json.loads(final_json_str)
        
        return jsonify({
            "status": "success",
            "data": result_dict
        })
        
    except Exception as e:
        print("Agent 3 外卖转化出错:", e)
        return jsonify({"status": "error", "message": "外卖雷达失效，请重试！"}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)