import { getSpanOfSentenceAtCursor } from '../../components/Editor'

describe('getSpanOfSentenceAtCursor', () => {
  it('gets span of single sentence', () => {
    const text = 'The quick brown fox jumps over the lazy dog.'
    const span = getSpanOfSentenceAtCursor(text, 0)
    expect(text.slice(span.start, span.end)).toEqual(
      'The quick brown fox jumps over the lazy dog.'
    )
  })

  it('gets span of first sentence when cursor is at beginning', () => {
    const text = 'Sometimes you win. Sometimes you lose.'
    const span = getSpanOfSentenceAtCursor(text, 0)
    expect(text.slice(span.start, span.end)).toEqual('Sometimes you win.')
  })

  it('gets span of last sentence when cursor is at end', () => {
    const text = 'Sometimes you win. Sometimes you lose.'
    const span = getSpanOfSentenceAtCursor(text, text.length - 1)
    expect(text.slice(span.start, span.end)).toEqual('Sometimes you lose.')
  })

  it('respects acronyms and numbers', () => {
    const text =
      'In the U.S., there are around 19.9 million college students. This is as of fall 2019.'
    const span = getSpanOfSentenceAtCursor(text, 0)
    expect(text.slice(span.start, span.end)).toEqual(
      'In the U.S., there are around 19.9 million college students.'
    )
  })

  it('respects the "etc." abbreviation', () => {
    const text =
      'Integers are numbers like 1, 2, 3, etc., but negative numbers can also be integers. And of course, zero is an integer too.'
    const span = getSpanOfSentenceAtCursor(text, 0)
    expect(text.slice(span.start, span.end)).toEqual(
      'Integers are numbers like 1, 2, 3, etc., but negative numbers can also be integers.'
    )
  })
})
