import React from 'react';
import {Composition} from 'remotion';
import {layoutFor} from './geometry';
import {TIMELINES} from './timeline';
import {XO, XOProps} from './XO';

const FPS = 60;

const comps: {id: string; props: XOProps}[] = [
	{id: 'XO-Main-9x16', props: {format: 'vertical', cut: 'main'}},
	{id: 'XO-Main-16x9', props: {format: 'horizontal', cut: 'main'}},
	{id: 'XO-Sting-9x16', props: {format: 'vertical', cut: 'sting'}},
	{id: 'XO-Sting-16x9', props: {format: 'horizontal', cut: 'sting'}},
];

export const RemotionRoot: React.FC = () => (
	<>
		{comps.map(({id, props}) => {
			const {width, height} = layoutFor(props.format);
			return (
				<Composition
					key={id}
					id={id}
					component={XO}
					durationInFrames={TIMELINES[props.cut].duration}
					fps={FPS}
					width={width}
					height={height}
					defaultProps={props}
				/>
			);
		})}
	</>
);
