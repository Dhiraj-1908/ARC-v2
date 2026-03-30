"use client";
import React from 'react';
import QuestionForm from './QuestionForm';

interface QnAProps {
  isDarkMode?: boolean;
}

const QnA = ({ isDarkMode = false }: QnAProps) => {
  return (
    <div>
      <QuestionForm isDarkMode={isDarkMode} />
    </div>
  );
};

export default QnA;