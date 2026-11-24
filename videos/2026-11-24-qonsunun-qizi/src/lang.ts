import React, {createContext, useContext} from 'react';
import type {Lang} from './config';

export const LangContext = createContext<Lang>('az');
export const useLang = () => useContext(LangContext);
export const LangProvider: React.FC<{lang: Lang; children: React.ReactNode}> = ({lang, children}) =>
  React.createElement(LangContext.Provider, {value: lang}, children);
