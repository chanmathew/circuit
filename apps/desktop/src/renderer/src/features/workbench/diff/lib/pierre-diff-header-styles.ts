export const DIFF_HEADER_FLASH_CLASS = 'circuit-diff-header-flash'

export const DIFF_HEADER_CSS = `
[data-title], [data-prev-name] {
  cursor: pointer;
}
[data-title]:hover bdi,
[data-prev-name]:hover bdi {
  text-decoration: underline;
}
[data-diffs-header=default] {
  padding-inline: 0;
  padding-block: 6px;
  min-height: calc(1lh + 20px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
[data-diffs-header=default] [data-header-content] {
  flex: 0 1 auto;
  min-width: 0;
  padding-left: 12px;
}
[data-diffs-header=default] [data-title] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-diffs-header=default] [data-metadata] {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  align-items: center;
  padding-right: 12px;
}
[data-diffs-header=default] [data-metadata] > [data-deletions-count]:first-child,
[data-diffs-header=default] [data-metadata] > [data-additions-count]:first-child {
  margin-left: 0;
}
[data-diffs-header=default] [data-deletions-count] + [data-additions-count] {
  margin-left: 6px;
}
[data-diffs-header=default] [data-metadata] > slot[name='header-metadata'] {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  margin-left: 0;
}
[data-diffs-header=default] slot[name='header-metadata']::slotted(div) {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  width: 100%;
}
[data-diffs-header=default] [data-additions-count],
[data-diffs-header=default] [data-deletions-count] {
  font-size: 10px;
  line-height: 1;
}
[data-diffs-header=default] [data-metadata] > [data-deletions-count],
[data-diffs-header=default] [data-metadata] > [data-additions-count] {
  display: none;
}
[data-diffs-header=default] [data-code],
[data-diffs-header=default] ~ [data-diff] [data-code] {
  padding-top: 0;
  padding-bottom: 0;
}
@keyframes circuit-diff-header-flash {
  0% {
    background-color: rgb(245 158 11 / 0.38);
  }
  100% {
    background-color: transparent;
  }
}
[data-diffs-header=default].${DIFF_HEADER_FLASH_CLASS} {
  animation: circuit-diff-header-flash 1.1s ease-out;
}
`
