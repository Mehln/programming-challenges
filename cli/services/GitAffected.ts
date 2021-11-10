import execa from 'execa'

import { Challenge } from './Challenge'
import { Solution } from './Solution'

const solutionsRegex = new RegExp(
  /challenges\/[\s\S]*\/solutions\/(c|cpp|cs|dart|java|javascript|python|rust|typescript)\/[\s\S]*\/(.*).(c|cpp|cs|dart|java|js|py|rs|ts)/
)

const dockerRegex = new RegExp(
  /templates\/docker\/(c|cpp|cs|dart|java|javascript|python|rust|typescript)\/Dockerfile/
)

const inputOutputRegex = new RegExp(
  /challenges\/[\s\S]*\/test\/(.*)\/(input.txt|output.txt)/
)

export interface GitAffectedOptions {
  isContinuousIntegration: boolean
  base?: string
}

export class GitAffected implements GitAffectedOptions {
  public isContinuousIntegration: boolean
  public base?: string

  constructor (options: GitAffectedOptions) {
    this.isContinuousIntegration = options.isContinuousIntegration
    this.base = options.base
  }

  public parseGitOutput (output: string): string[] {
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  public async getFilesUsingBaseAndHead (
    base: string,
    head: string
  ): Promise<string[]> {
    try {
      const { stdout } = await execa.command(
        `git diff --name-only --relative ${base} ${head}`
      )
      return this.parseGitOutput(stdout)
    } catch {
      return []
    }
  }

  public async getUncommittedFiles (): Promise<string[]> {
    return await this.getFilesUsingBaseAndHead('HEAD', '.')
  }

  public async getLatestPushedCommit (): Promise<string> {
    const latestCommit = this.isContinuousIntegration ? '~1' : ''
    const { stdout } = await execa.command(`git rev-parse origin/master${latestCommit}`)
    return stdout
  }

  public async getUnpushedFiles (): Promise<string[]> {
    return await this.getFilesUsingBaseAndHead(
      await this.getLatestPushedCommit(),
      '.'
    )
  }

  public async getAffectedSolutions (): Promise<Solution[]> {
    let files = [
      ...(await this.getUnpushedFiles()),
      ...(await this.getUncommittedFiles())
    ]
    if (this.base != null) {
      files.push(...(await this.getFilesUsingBaseAndHead(this.base, '.')))
    }
    files = Array.from(new Set(files))
    const affectedSolutionsPaths = files.filter((filePath) => {
      return solutionsRegex.test(filePath)
    })
    const affectedDockerPaths = files.filter((filePath) => {
      return dockerRegex.test(filePath)
    })
    const affectedLanguages = affectedDockerPaths.map((filePath) => {
      const [,, programmingLanguageName] = filePath.replaceAll('\\', '/').split('/')
      return programmingLanguageName
    })
    const affectedInputOutput = files.filter((filePath) => {
      return inputOutputRegex.test(filePath)
    })
    const affectedChallenges = affectedInputOutput.map((filePath) => {
      const [, challengeName] = filePath.replaceAll('\\', '/').split('/')
      return new Challenge({ name: challengeName })
    })
    const solutionsChallenges = await Solution.getManyByPaths(affectedSolutionsPaths)
    const solutionsDocker = await Solution.getManyByProgrammingLanguages(affectedLanguages)
    const solutions: Solution[] = solutionsDocker
    for (const solution of solutionsChallenges) {
      if (!affectedLanguages.includes(solution.programmingLanguageName)) {
        solutions.push(solution)
      }
    }
    for (const challenge of affectedChallenges) {
      let isSolutionIncluded = false
      for (const solution of solutions) {
        if (solution.challenge.name === challenge.name) {
          isSolutionIncluded = true
          break
        }
      }
      if (!isSolutionIncluded) {
        const solutionsByChallenge = await Solution.getManyByChallenge(challenge)
        solutions.push(...solutionsByChallenge)
      }
    }
    return solutions
  }
}
