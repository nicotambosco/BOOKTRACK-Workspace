import importlib.util
from pathlib import Path
from subprocess import CompletedProcess
import tempfile
import unittest
from django.conf import settings

spec = importlib.util.spec_from_file_location('publish_data', settings.BASE_DIR.parent/'tools/publicar_datos.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.calls = []
        self.status = ''
        self.behind = '0'
        self.export_fails = self.push_fails = False

    def runner(self, args, **kwargs):
        self.calls.append(args)
        output, code = '', 0
        if args[:3] == ['git','symbolic-ref','--short']: output = 'master'
        if args[:3] == ['git','status','--porcelain']: output = self.status
        if args[:3] == ['git','rev-list','--count']: output = self.behind
        if 'exportar_datos' in args:
            if self.export_fails: code = 1
            else:
                snapshot = self.root/publisher.SNAPSHOT
                snapshot.parent.mkdir(exist_ok=True)
                snapshot.write_bytes(publisher.MAGIC+b'encrypted-test-placeholder')
        if args[:2] == ['git','push'] and self.push_fails: code = 1
        return CompletedProcess(args, code, output, '')

    def test_publishes_only_encrypted_copy_with_explicit_git_path(self):
        self.status = ' M data/booktrack.btbak\n'
        publisher.publish(self.root, runner=self.runner)
        self.assertIn(['git','add','--','data/booktrack.btbak'], self.calls)
        self.assertIn(['git','push','origin','HEAD:master'], self.calls)
        commit = next(args for args in self.calls if args[:2] == ['git','commit'])
        self.assertEqual(commit[-3:], ['--only','--','data/booktrack.btbak'])
        self.assertFalse(any('.env' in arg for args in self.calls for arg in args))

    def test_dirty_code_or_outdated_branch_aborts_before_export(self):
        self.status = ' M README.md'
        with self.assertRaises(publisher.PublishError): publisher.publish(self.root, runner=self.runner)
        self.assertFalse(any('exportar_datos' in args for args in self.calls))
        self.status, self.behind, self.calls = '', '1', []
        with self.assertRaises(publisher.PublishError): publisher.publish(self.root, runner=self.runner)
        self.assertFalse(any('exportar_datos' in args for args in self.calls))

    def test_export_failure_aborts_before_git_add_or_push(self):
        self.export_fails = True
        with self.assertRaises(publisher.PublishError): publisher.publish(self.root, runner=self.runner)
        self.assertFalse(any(args[:2] in [['git','add'],['git','push']] for args in self.calls))

    def test_push_failure_preserves_local_copy_and_commit(self):
        self.push_fails = True
        with self.assertRaises(publisher.PublishError): publisher.publish(self.root, runner=self.runner)
        self.assertTrue((self.root/publisher.SNAPSHOT).exists())
        self.assertTrue(any(args[:2] == ['git','commit'] for args in self.calls))

    def test_docker_export_and_offline_mode(self):
        publisher.publish(self.root, docker=True, no_push=True, runner=self.runner)
        self.assertTrue(any(args[:4] == ['docker','compose','exec','-T'] for args in self.calls))
        self.assertFalse(any(args[:2] in [['git','push'],['git','fetch']] for args in self.calls))
