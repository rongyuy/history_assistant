# 此处编写对接大语言模型API的逻辑
from app.schemas.main_schemas import AIChatRequest

def get_socratic_response(request: AIChatRequest) -> str:
    # TODO: 在这里构建完整的Prompt并调用LLM API
    # 这是项目的核心AI逻辑
    print("AI Service: Received request for topic:", request.topic)
    # 返回一个示例问题
    return f"这是一个关于“{request.topic}”的引导性问题，请问你怎么看？"