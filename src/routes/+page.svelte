<script lang="ts">
	import { tweened } from 'svelte/motion'
	import { fade } from 'svelte/transition'
	import { FFmpeg } from '@ffmpeg/ffmpeg'
	import { confetti } from '@neoconfetti/svelte'
	import { onMount } from 'svelte'

	type State = 'loading' | 'loaded' | 'convert.start' | 'convert.error' | 'convert.success'

	let state: State = 'loading'
	let error = ''
	let ffmpeg: FFmpeg
	let progress = tweened(0)
	let succuessMsg = ''

	function downloadVideo(data: Uint8Array) {
		const a = document.createElement('a')
		a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
		a.download = 'output.mp4'

		setTimeout(() => {
			succuessMsg = '🎊 Conversion complete. 🎊'
			a.click()
			setTimeout(() => {
				succuessMsg = 'Download complete!'
			}, 1000)
			succuessMsg = ''
		}, 1000)
	}

	async function readFile(video: File): Promise<Uint8Array> {
		return new Promise((resolve) => {
			const fileReader = new FileReader()
			fileReader.onload = () => {
				const result = fileReader.result as ArrayBuffer
				resolve(new Uint8Array(result))
			}

			fileReader.onerror = () => {
				error = 'Failed to read the file.'
			}
			fileReader.readAsArrayBuffer(video)
		})
	}

	async function convertVideo(video: File) {
		state = 'convert.start'
		error = ''
		const videoData = await readFile(video)

		await ffmpeg.writeFile('input.webm', videoData)
		await ffmpeg.exec(['-i', 'input.webm', 'output.mp4'])
		const data = await ffmpeg.readFile('output.mp4')
		state = 'convert.success'
		return data as Uint8Array
	}

	async function handleDrop(event: DragEvent) {
		if (!event.dataTransfer) return
		if (event.dataTransfer.files.length > 1) {
			error = 'Please drop only one file at a time.'
			return
		}

		if (event.dataTransfer.files[0].type === 'video/webm') {
			error = ''
			const [file] = event.dataTransfer.files
			const data = await convertVideo(file)
			downloadVideo(data)
		} else {
			error = 'Only WebM videos are supported.'
		}
	}

	async function loadFFmpeg() {
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm'

		ffmpeg = new FFmpeg()

		ffmpeg.on('progress', ({ progress }) => {
			$progress = progress * 100
		})

		await ffmpeg.load({
			coreURL: `/ffmpeg/ffmpeg-core.js`,
			wasmURL: `/ffmpeg/ffmpeg-core.wasm`
		})

		state = 'loaded'
	}

	onMount(() => {
		loadFFmpeg()
	})

	$: console.log('State: ', state)
</script>

<h1 class="title">WebM To MP4 Converter</h1>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	on:drop|preventDefault={handleDrop}
	on:dragover|preventDefault={() => {}}
	data-state={state}
	class="drop"
>
	{#if state === 'loading'}
		<p in:fade>Loading FFmpeg...</p>
	{/if}
	{#if state === 'loaded'}
		<p in:fade>Drag video here.</p>
	{/if}
	{#if state === 'convert.start'}
		<p in:fade>Conversion underway.</p>

		<div class="progress-bar">
			<div class="progress" style:--progress="{$progress}%">
				<p class="progress-text">{$progress.toFixed(0)}%</p>
			</div>
		</div>
	{/if}
	{#if state === 'convert.success'}
		<div use:confetti />
		<p in:fade>{succuessMsg}</p>
	{/if}
	{#if error}
		<p in:fade class="error">{error}</p>
	{/if}
</div>

<style>
	h1 {
		text-align: center;
	}

	.drop {
		width: 600px;
		height: 400px;
		display: grid;
		place-content: center;
		margin-block-start: 2rem;
		border: 10px dashed var(--border);
	}

	.drop p {
		font-size: 2rem;
		text-align: center;
	}

	.error {
		color: var(--error);
	}

	.progress-bar {
		--progress-bar-bg: var(--aqua);
		--progress-bar-text: var(--border);

		width: 300px;
		height: 40px;
		position: relative;
		font-weight: 700;
		background-color: var(--dark-grey);
		border-radius: 8px;
	}

	.progress-bar .progress {
		width: var(--progress);
		height: 100%;
		position: absolute;
		left: 0;
		display: grid;
		place-content: center;
		background-color: var(--progress-bar-bg);
		color: var(--progress-bar-text);
		border-radius: 8px;
	}

	.progress-text {
		font-size: 1rem !important;
		text-shadow: 0px 0px 5px hsla(0, 0%, 100%, 0.5);
	}
</style>
