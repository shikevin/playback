from threading import Timer
import argparse
import glob
import logging
import os
import random

from tophat_client.app import App
from tophat_client.client import Client
from tophat_client.module_item import Status as ModuleItemStatus


class Trivia(App):
    catalog = []

    def on_registered(self):
        t = Timer(1.0, self.start)  # wait for all auths to fly in, flaky?
        t.start()

    def start(self):
        self.remote_control.magnify()
        self.ask_random_question()

    def ask_random_question(self):
        (question_text, self.expected_answers) = random.choice(self.catalog)
        self.current_question = self.client.create_word_question(
            'trivia question',
            question_text,
            correct_answers=self.expected_answers,
        )

    def show_results(self):
        question = self.current_question
        question.status = ModuleItemStatus.visible
        remote = self.remote_control
        remote.show_answer(question)
        remote.show_reports(question)

        t = Timer(10.0, self.ask_next_question)
        t.start()

    def ask_next_question(self):
        self.current_question.status = ModuleItemStatus.review
        self.ask_random_question()

    def on_report_update(self, resource, report_data):
        for user, response in report_data['All Data'].iteritems():
            answer = self._normalize_answer(response['answer'])
            if answer in self.expected_answers:
                self.show_results()

    def load_questions(self, pattern):
        for filename in glob.glob(pattern):
            with open(filename, 'r') as file:
                for line in file:
                    (question, answers) = line.split('`', 1)
                    answers = map(self._normalize_answer, answers.split('`'))
                    self.catalog.append((question, answers))

    def _normalize_answer(self, answer):
        return answer.lower().strip()

    def on_timer_pause(self, module_item_id, seconds):
        self.show_results()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('username', help="tophat username")
    parser.add_argument('password', help="tophat password")
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG)

    client = Client(
        os.getenv('TOPHAT_DEPLOYMENT', 'https://app.tophat.com')
    )
    client.login(args.username, args.password)
    a = Trivia(client)
    a.load_questions('triviabot/questions/**')
    a.run()
