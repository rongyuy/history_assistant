// useSpeechRecognition.js
import { useState, useRef, useCallback } from 'react';

// 检查浏览器是否支持 Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

export const useSpeechRecognition = (onResult) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      alert("抱歉，您的浏览器不支持语音识别。请尝试 Chrome 或 Edge。");
      return;
    }
    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // 设置语言为中文
    recognition.interimResults = true; // 获取中间结果
    recognition.continuous = false; // 一句话识别结束后即停止

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');

      // 当识别结束时（isFinal），调用回调函数
      if (event.results[0].isFinal) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    isSpeechRecognitionSupported
  };
};